// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Генерує тимчасове посилання для завантаження фотографії в Convex Storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Необхідно авторизуватися");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Отримує всі повідомлення бесіди
 * Сортування: від найновіших до найстаріших (для inverted FlatList)
 */
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return [];

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return [];
    }

    // Завантажуємо повідомлення за індексом розмови
    const rawMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    // Сортуємо від найновіших до найстаріших (desc)
    rawMessages.sort((a, b) => b.createdAt - a.createdAt);

    // Доповнюємо інформацією про авторів
    const enrichedMessages = await Promise.all(
      rawMessages.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);
        return {
          ...msg,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ??
            sender?.fullname ??
            sender?.name ??
            "Користувач",
          senderImage: sender?.image,
          isMine: msg.senderId === currentUserId,
          senderAvatar: sender?.image,
        };
      }),
    );

    return enrichedMessages;
  },
});

/**
 * Отримує повідомлення бесіди порціями (з пагінацією)
 * Сортування: від найновіших до найстаріших (desc) для інвертованого FlatList
 */
export const getPaginatedMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // Перевіряємо, чи існує бесіда та чи користувач є її учасником
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participantIds.includes(currentUserId)) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // 1. Завантажуємо порцію повідомлень за індексом розмови
    // order("desc") гарантує порядок від найсвіжіших до старіших за _creationTime
    const paginated = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    // 2. Збагачуємо інформацією про авторів ТІЛЬКИ поточну завантажену сторінку (page)
    const enrichedMessages = await Promise.all(
      paginated.page.map(async (msg) => {
        const sender = await ctx.db.get(msg.senderId);

        // Отримуємо всі реакції для даного повідомлення
        const reactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .collect();

        // Групуємо реакції за емодзі та перевіряємо, чи голосував поточний юзер
        const reactionMap = new Map<
          string,
          { count: number; hasReacted: boolean }
        >();

        for (const r of reactions) {
          const item = reactionMap.get(r.emoji) ?? {
            count: 0,
            hasReacted: false,
          };
          item.count += 1;
          if (r.userId === currentUserId) {
            item.hasReacted = true;
          }
          reactionMap.set(r.emoji, item);
        }

        const formattedReactions = Array.from(reactionMap.entries()).map(
          ([emoji, data]) => ({
            emoji,
            count: data.count,
            hasReacted: data.hasReacted,
          }),
        );

        return {
          ...msg,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ??
            sender?.fullname ??
            sender?.name ??
            "Користувач",
          senderImage: sender?.image,
          isMine: msg.senderId === currentUserId,
          senderAvatar: sender?.image,
          reactions: formattedReactions, // &#x1f448; Агреговані реакції
        };
      }),
    );

    return {
      ...paginated,
      page: enrichedMessages,
    };
  },
});

/**
 * Відправляє повідомлення в бесіду (текст та/або фото)
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),

    // &#x1f448; Нові аргументи:
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),

    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Бесіду не знайдено");
    }

    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error("Ви не можете надсилати повідомлення в цей чат");
    }

    const trimmedContent = args.content.trim();
    if (
      !trimmedContent &&
      !args.storageId &&
      !args.audioStorageId &&
      !args.videoStorageId
    ) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    let imageUrl: string | undefined = undefined;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) imageUrl = url;
    }

    let audioUrl: string | undefined = undefined;
    if (args.audioStorageId) {
      const url = await ctx.storage.getUrl(args.audioStorageId);
      if (url) audioUrl = url;
    }

    // &#x1f448; Отримуємо публічний URL відеокружечка
    let videoUrl: string | undefined = undefined;
    if (args.videoStorageId) {
      const url = await ctx.storage.getUrl(args.videoStorageId);
      if (url) videoUrl = url;
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: trimmedContent,
      imageUrl,
      storageId: args.storageId,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      videoUrl,
      videoStorageId: args.videoStorageId,
      videoDuration: args.videoDuration,
      isVideoNote: args.isVideoNote,
      createdAt: now,
      replyToId: args.replyToId,
      replyToSender: args.replyToSender,
      replyToText: args.replyToText,
    });

    // Формуємо текст останнього повідомлення для списку бесід
    let previewText = trimmedContent;
    if (!previewText) {
      if (args.isVideoNote) {
        const dur = args.videoDuration
          ? ` (${Math.round(args.videoDuration)}с)`
          : "";
        previewText = `&#x1f4f9; Відеоповідомлення${dur}`;
      } else if (args.audioStorageId) {
        const dur = args.audioDuration
          ? ` (${Math.round(args.audioDuration)}с)`
          : "";
        previewText = `&#x1f3a4; Голосове повідомлення${dur}`;
      } else if (args.storageId) {
        previewText = "&#x1f4f7; Фотографія";
      }
    }

    await ctx.db.patch(args.conversationId, {
      lastMessage: previewText,
      lastMessageAt: now,
    });

    return messageId;
  },
});

export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Повідомлення не знайдено");
    }

    // Шукаємо, чи поточний користувач уже ставив реакцію на це повідомлення
    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) =>
        q.eq("userId", userId).eq("messageId", args.messageId),
      )
      .first();

    if (existing) {
      if (existing.emoji === args.emoji) {
        // Якщо натиснули той самий емодзі повторно — видаляємо реакцію
        await ctx.db.delete(existing._id);
        return { action: "removed", emoji: args.emoji };
      } else {
        // Якщо натиснули інший емодзі — замінюємо його
        await ctx.db.patch(existing._id, { emoji: args.emoji });
        return { action: "updated", emoji: args.emoji };
      }
    } else {
      // Додаємо нову реакцію
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
      });
      return { action: "added", emoji: args.emoji };
    }
  },
});

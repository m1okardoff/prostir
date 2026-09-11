// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
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
 * Відправляє повідомлення в бесіду (текст та/або фото)
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    storageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")), // 👈 для аудіо
    audioDuration: v.optional(v.number()), // 👈 тривалість у секундах
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
    // Повідомлення вважається валідним, якщо є текст, фото АБО голосове
    if (!trimmedContent && !args.storageId && !args.audioStorageId) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    // Якщо передано storageId — генеруємо публічний URL зображення
    let imageUrl: string | undefined = undefined;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) {
        imageUrl = url;
      }
    }

    let audioUrl: string | undefined = undefined;
    if (args.audioStorageId) {
      const url = await ctx.storage.getUrl(args.audioStorageId);
      if (url) audioUrl = url;
    }

    const now = Date.now();

    // Зберігаємо повідомлення в таблицю messages
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: trimmedContent,
      imageUrl,
      storageId: args.storageId,
      audioUrl,
      audioStorageId: args.audioStorageId,
      audioDuration: args.audioDuration,
      createdAt: now,
    });

    // Формуємо прев'ю останнього повідомлення для списку бесід
    let previewText = trimmedContent;
    if (!previewText) {
      if (args.audioStorageId) {
        const dur = args.audioDuration
          ? ` (${Math.round(args.audioDuration)}с)`
          : "";
        previewText = `🎤 Голосове повідомлення${dur}`;
      } else if (args.storageId) {
        previewText = "📷 Фотографія";
      }
    }

    await ctx.db.patch(args.conversationId, {
      lastMessage: previewText,
      lastMessageAt: now,
    });

    return messageId;
  },
});

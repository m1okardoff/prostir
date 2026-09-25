// convex/messages.ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
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

        let videoUrl = msg.videoUrl;
        if (!videoUrl && msg.videoStorageId) {
          videoUrl =
            (await ctx.storage.getUrl(msg.videoStorageId)) ?? undefined;
        }

        let imageUrl = msg.imageUrl;
        if (!imageUrl && msg.storageId) {
          imageUrl = (await ctx.storage.getUrl(msg.storageId)) ?? undefined;
        }

        let audioUrl = msg.audioUrl;
        if (!audioUrl && msg.audioStorageId) {
          audioUrl =
            (await ctx.storage.getUrl(msg.audioStorageId)) ?? undefined;
        }

        return {
          ...msg,
          imageUrl,
          audioUrl,
          videoUrl,
          isSystem: msg.isSystem ?? false,
          senderName:
            sender?.username ??
            sender?.fullname ??
            sender?.name ??
            "Користувач",
          senderImage: sender?.image,
          isMine: msg.senderId === currentUserId,
          senderAvatar: sender?.image,
          reactions: formattedReactions,
          isEdited: msg.isEdited ?? false, // 👈 РЕАЛЬНО НОВЕ ПОЛЕ
          updatedAt: msg.updatedAt, // 👈 РЕАЛЬНО НОВiШЕ НОВОГО ПОЛЯ
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
    waveform: v.optional(v.array(v.number())),

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
      waveform: args.waveform,
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

    const sender = await ctx.db.get(currentUserId);
    const senderName =
      sender?.fullname ?? sender?.username ?? sender?.name ?? "Користувач";

    // Отримуємо ID всіх учасників, крім відправника
    const otherParticipantIds = conversation.participantIds.filter(
      (id) => id !== currentUserId,
    );

    if (otherParticipantIds.length > 0) {
      // Завантажуємо дані учасників для отримання їх pushToken
      const otherUsers = await Promise.all(
        otherParticipantIds.map((id) => ctx.db.get(id)),
      );

      // Формуємо заголовок повідомлення:
      // Для груп: "Назва групи • Ім'я автора"
      // Для особистих: "Ім'я автора"
      const notificationTitle = conversation.isGroup
        ? `${conversation.name ?? "Груповий чат"} • ${senderName}`
        : senderName;

      // Збираємо список повідомлень для всіх учасників, у яких збережено pushToken
      const pushNotificationsToSend = otherUsers
        .filter((user) => user && user.pushToken)
        .map((user) => ({
          pushToken: user!.pushToken!,
          title: notificationTitle,
          body: previewText || "Надіслав(-ла) повідомлення",
          data: {
            type: "chat",
            conversationId: args.conversationId,
          },
        }));

      if (pushNotificationsToSend.length === 1) {
        // Одиночний чат
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotification,
          pushNotificationsToSend[0],
        );
      } else if (pushNotificationsToSend.length > 1) {
        // Груповий чат — відправляємо всім разом через batch action
        await ctx.scheduler.runAfter(
          0,
          internal.pushNotifications.sendPushNotificationsBatch,
          { notifications: pushNotificationsToSend },
        );
      }
    }

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

/**
 * Редагує текст існуючого повідомлення
 */
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Повідомлення не знайдено");
    }

    // Лише автор повідомлення може його редагувати
    if (message.senderId !== currentUserId) {
      throw new Error("Ви можете редагувати лише власні повідомлення");
    }

    // Системні повідомлення редагувати не можна
    if (message.isSystem) {
      throw new Error("Системні повідомлення не можна редагувати");
    }

    const trimmedContent = args.content.trim();
    if (!trimmedContent) {
      throw new Error("Повідомлення не може бути порожнім");
    }

    const now = Date.now();

    // Оновлюємо вміст повідомлення
    await ctx.db.patch(args.messageId, {
      content: trimmedContent,
      isEdited: true,
      updatedAt: now,
    });

    // Якщо це повідомлення було найостаннішим у бесіді, оновлюємо прев'ю
    const latestMessage = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId),
      )
      .order("desc")
      .first();

    if (latestMessage?._id === args.messageId) {
      await ctx.db.patch(message.conversationId, {
        lastMessage: trimmedContent,
      });
    }

    return { success: true };
  },
});

/**
 * Видаляє окреме повідомлення з чату з очищенням медіафайлів та оновленням останнього повідомлення
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Повідомлення не знайдено");
    }

    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) {
      throw new Error("Бесіду не знайдено");
    }

    // Перевірка прав: видаляти може або автор повідомлення,
    // або творець / адміністратор групового чату
    const isAuthor = message.senderId === currentUserId;
    const isCreator = conversation.creatorId === currentUserId;
    const isAdmin = conversation.adminIds?.includes(currentUserId) ?? false;

    if (!isAuthor && !isCreator && !isAdmin) {
      throw new Error("У вас немає прав для видалення цього повідомлення");
    }

    // 1. Очищення пов'язаних файлів зі сховища Convex Storage
    if (message.storageId) {
      await ctx.storage.delete(message.storageId).catch(() => {});
    }
    if (message.audioStorageId) {
      await ctx.storage.delete(message.audioStorageId).catch(() => {});
    }
    if (message.videoStorageId) {
      await ctx.storage.delete(message.videoStorageId).catch(() => {});
    }

    // 2. Видалення реакцій, прив'язаних до цього повідомлення
    const reactions = await ctx.db
      .query("messageReactions")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    for (const reaction of reactions) {
      await ctx.db.delete(reaction._id);
    }

    // 3. Видалення самого повідомлення
    await ctx.db.delete(args.messageId);

    // 4. Оновлюємо останнє повідомлення у бесіді, якщо видалене повідомлення було найостаннішим
    const remainingLatest = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", message.conversationId),
      )
      .order("desc")
      .first();

    if (remainingLatest) {
      let previewText = remainingLatest.content;
      if (!previewText) {
        if (remainingLatest.audioUrl || remainingLatest.audioStorageId) {
          previewText = "&#x1f3a4; Голосове повідомлення";
        } else if (remainingLatest.videoUrl || remainingLatest.videoStorageId) {
          previewText = "&#x1f4f9; Відеоповідомлення";
        } else if (remainingLatest.imageUrl || remainingLatest.storageId) {
          previewText = "&#x1f4f7; Фотографія";
        }
      }

      await ctx.db.patch(message.conversationId, {
        lastMessage: previewText,
        lastMessageAt: remainingLatest.createdAt,
      });
    } else {
      // Якщо в чаті більше немає повідомлень
      await ctx.db.patch(message.conversationId, {
        lastMessage: undefined,
        lastMessageAt: undefined,
      });
    }

    return { success: true };
  },
});

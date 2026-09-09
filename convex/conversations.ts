import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Отримує всі бесіди, у яких бере участь поточний користувач
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Отримуємо всі бесіди
    const allConversations = await ctx.db.query("conversations").collect();

    // Фільтруємо ті, де поточний користувач є в списку учасників
    const userConversations = allConversations.filter((c) =>
      c.participantIds.includes(userId)
    );

    // Сортуємо: новіші зверху (за lastMessageAt або _creationTime)
    userConversations.sort(
      (a, b) =>
        (b.lastMessageAt ?? b._creationTime) - (a.lastMessageAt ?? a._creationTime)
    );

    // Збагачуємо даними співрозмовників
    const enriched = await Promise.all(
      userConversations.map(async (conv) => {
        // Якщо це особистий чат — знаходимо іншого користувача
        let otherUser = null;
        if (!conv.isGroup) {
          const otherUserId = conv.participantIds.find((id) => id !== userId);
          if (otherUserId) {
            otherUser = await ctx.db.get(otherUserId);
          }
        }

        // Отримуємо список аватарів учасників (для груп)
        const participants = await Promise.all(
          conv.participantIds.map((id) => ctx.db.get(id))
        );

        return {
          ...conv,
          otherUser: otherUser
            ? {
                _id: otherUser._id,
                username: otherUser.username ?? otherUser.name ?? "Користувач",
                fullname: otherUser.fullname ?? otherUser.name ?? "",
                image: otherUser.image,
              }
            : null,
          participantCount: conv.participantIds.length,
          participants: participants.filter((p) => p !== null),
        };
      })
    );

    return enriched;
  },
});

/**
 * Отримує існуючий або створює новий особистий діалог між поточним користувачем та іншим
 */
export const getOrCreateDirectConversation = mutation({
  args: { participantId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    if (currentUserId === args.participantId) {
      throw new Error("Не можна створити чат із самим собою");
    }

    // Шукаємо, чи вже існує 1-on-1 чат між цими двома користувачами
    const allConversations = await ctx.db.query("conversations").collect();
    const existing = allConversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds.length === 2 &&
        c.participantIds.includes(currentUserId) &&
        c.participantIds.includes(args.participantId)
    );

    if (existing) {
      return existing._id;
    }

    // Якщо діалогу ще немає — створюємо новий
    const newConversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      participantIds: [currentUserId, args.participantId],
      creatorId: currentUserId,
      lastMessage: undefined,
      lastMessageAt: Date.now(),
    });

    return newConversationId;
  },
});

/**
 * Створює новий груповий чат
 */
export const createGroupConversation = mutation({
  args: {
    name: v.string(),
    participantIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Unauthorized: Необхідно авторизуватися");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Введіть назву групового чату");
    }

    // Обов'язково додаємо творця до масиву учасників (без дублювання)
    const uniqueParticipants = Array.from(
      new Set([currentUserId, ...args.participantIds])
    );

    if (uniqueParticipants.length < 2) {
      throw new Error("Груповий чат повинен мати щонайменше 2 учасників");
    }

    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      name: trimmedName,
      participantIds: uniqueParticipants,
      creatorId: currentUserId,
      lastMessage: "Груповий чат створено",
      lastMessageAt: Date.now(),
    });

    return conversationId;
  },
});

/**
 * Отримує деталі конкретної бесіди за її ID
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return null;

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    if (!conversation.participantIds.includes(currentUserId)) {
      throw new Error("Access denied: Ви не є учасником цієї бесіди");
    }

    let otherUser = null;
    if (!conversation.isGroup) {
      const otherUserId = conversation.participantIds.find(
        (id) => id !== currentUserId
      );
      if (otherUserId) {
        otherUser = await ctx.db.get(otherUserId);
      }
    }

    const participants = await Promise.all(
      conversation.participantIds.map((id) => ctx.db.get(id))
    );

    return {
      ...conversation,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            username: otherUser.username ?? otherUser.name ?? "Користувач",
            fullname: otherUser.fullname ?? otherUser.name ?? "",
            image: otherUser.image,
          }
        : null,
      participants: participants.filter((p) => p !== null),
    };
  },
});

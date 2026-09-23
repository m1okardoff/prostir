import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    fullname: v.optional(v.string()),
    bio: v.optional(v.string()),
    followers: v.optional(v.number()),
    following: v.optional(v.number()),
    posts: v.optional(v.number()),
  }).index("by_email", ["email"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(v.literal("like"), v.literal("comment"), v.literal("follow")),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
  }).index("by_receiver", ["receiverId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_both", ["userId", "postId"]),

  stories: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    expiresAt: v.number(), // Timestamp закінчення дії історії (24 години)
    views: v.number(), // Кількість переглядів
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  conversations: defineTable({
    isGroup: v.boolean(), // true для груп, false для особистих діалогів
    name: v.optional(v.string()), // Назва групи (для групових чатів)
    participantIds: v.array(v.id("users")), // Масив ID учасників
    creatorId: v.id("users"), // Автор/творець чату
    lastMessage: v.optional(v.string()), // Текст останнього повідомлення для списку чатів
    lastMessageAt: v.optional(v.number()), // Час останнього повідомлення (для сортування)
    adminIds: v.optional(v.array(v.id("users"))), // &#x1f448; НОВЕ ПОЛЕ: Список ID адміністраторів чату
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    audioUrl: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
    audioDuration: v.optional(v.number()),

    // &#x1f448; НОВЕ ПОЛЕ: масив амплітуд для звукової хвилі (0.1 .. 1.0)
    waveform: v.optional(v.array(v.number())),

    videoUrl: v.optional(v.string()),
    videoStorageId: v.optional(v.id("_storage")),
    videoDuration: v.optional(v.number()),
    isVideoNote: v.optional(v.boolean()),

    createdAt: v.number(),
    replyToId: v.optional(v.id("messages")),
    replyToSender: v.optional(v.string()),
    replyToText: v.optional(v.string()),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_created_at", ["createdAt"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(), // "❤️", "&#x1f44d;", "&#x1f525;", "&#x1f602;", "&#x1f62e;", "&#x1f622;"
  })
    .index("by_message", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),
});

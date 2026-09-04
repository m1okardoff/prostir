import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Додає або видаляє пост із закладок
 */
export const toggleBookmark = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    // Перевіряємо, чи вже є у закладках
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_both", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (existingBookmark) {
      await ctx.db.delete(existingBookmark._id);
      return false; // Видалено із закладок
    } else {
      await ctx.db.insert("bookmarks", {
        userId,
        postId: args.postId,
      });
      return true; // Додано в закладки
    }
  },
});

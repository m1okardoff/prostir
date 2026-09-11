import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const getBookmarkedPosts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }

    // Отримуємо закладки поточного користувача
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (bookmarks.length === 0) return [];

    const postsWithInfo = await Promise.all(
      bookmarks.map(async (bookmark) => {
        const post = await ctx.db.get(bookmark.postId);
        if (!post) return null;

        const postAuthor = await ctx.db.get(post.userId);

        // Перевіряємо, чи користувач лайкнув цей пост
        const like = await ctx.db
          .query("likes")
          .withIndex("by_user_and_post", (q) =>
            q.eq("userId", userId).eq("postId", post._id),
          )
          .first();

        return {
          ...post,
          author: {
            _id: postAuthor?._id,
            username: postAuthor?.username ?? postAuthor?.name ?? "user",
            image:
              postAuthor?.image ??
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
          },
          isLiked: !!like,
          isBookmarked: true,
        };
      }),
    );

    return postsWithInfo.filter(
      (post): post is NonNullable<typeof post> => post !== null,
    );
  },
});

/**
 * Отримує збережені пости поточного користувача з курсорною пагінацією
 * для високопродуктивної сітки 3x3
 */
export const getPaginatedBookmarks = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        page: [],
        isDone: true,
        continueCursor: "",
      };
    }

    // 1. Завантажуємо порцію закладок користувача (від найновіших до старіших)
    const paginated = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    // 2. Завантажуємо інформацію про пости ТІЛЬКИ для поточної порції
    const posts = await Promise.all(
      paginated.page.map(async (bookmark) => {
        const post = await ctx.db.get(bookmark.postId);
        if (!post) return null;

        return {
          _id: post._id,
          imageUrl: post.imageUrl,
          caption: post.caption,
          createdAt: post.createdAt,
          bookmarkId: bookmark._id,
        };
      }),
    );

    // 3. Відфільтровуємо пости, які могли бути видалені авторами
    const validPosts = posts.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    return {
      ...paginated,
      page: validPosts,
    };
  },
});

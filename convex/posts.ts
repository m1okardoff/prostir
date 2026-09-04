import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Генерує тимчасове посилання для завантаження файлу в Convex Storage
 */
export const generateUploadUrl = mutation(async (ctx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized: Неавторизований доступ");
  }
  return await ctx.storage.generateUploadUrl();
});

/**
 * Зберігає пост у БД та оновлює кількість постів у профілі користувача
 */
export const createPost = mutation({
  args: {
    caption: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized: Неавторизований доступ");
    }

    // Завантажуємо поточного користувача
    const currentUser = await ctx.db.get(userId);
    if (!currentUser) {
      throw new Error("User not found: Користувача не знайдено");
    }

    // Отримуємо публічне посилання на завантажене зображення
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new Error("Image URL not found: Не вдалося згенерувати посилання на зображення");
    }

    // Вставляємо пост в таблицю "posts"
    const postId = await ctx.db.insert("posts", {
      userId,
      imageUrl,
      storageId: args.storageId,
      caption: args.caption,
      likes: 0,
      comments: 0,
    });

    // Оновлюємо лічильник постів користувача
    await ctx.db.patch(userId, {
      posts: (currentUser.posts ?? 0) + 1,
    });

    return postId;
  },
});

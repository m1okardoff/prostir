import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Внутрішній екшен для відправки одиночного push-сповіщення через Expo Push Service
 */
export const sendPushNotification = internalAction({
  args: {
    pushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    // Перевіряємо базовий формат Expo-токена
    if (!args.pushToken || !args.pushToken.startsWith("ExponentPushToken[")) {
      console.log(
        "⚠️ Некоректний Expo pushToken, пропускаємо:",
        args.pushToken,
      );
      return { success: false, reason: "Invalid token" };
    }

    const message = {
      to: args.pushToken,
      sound: "default",
      title: args.title,
      body: args.body,
      data: args.data ?? {},
      priority: "high",
      channelId: "default",
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log(
        "&#x1f4e8; Push notification send result:",
        JSON.stringify(result),
      );
      return result;
    } catch (error) {
      console.error("❌ Помилка відправки push-сповіщення:", error);
      return { error: String(error) };
    }
  },
});

/**
 * Внутрішній екшен для пакетної відправки сповіщень (наприклад, у групових бесідах)
 */
export const sendPushNotificationsBatch = internalAction({
  args: {
    notifications: v.array(
      v.object({
        pushToken: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const validMessages = args.notifications
      .filter(
        (n) => n.pushToken && n.pushToken.startsWith("ExponentPushToken["),
      )
      .map((n) => ({
        to: n.pushToken,
        sound: "default",
        title: n.title,
        body: n.body,
        data: n.data ?? {},
        priority: "high",
        channelId: "default",
      }));

    if (validMessages.length === 0) {
      return { sent: 0 };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validMessages),
      });

      const result = await response.json();
      console.log(
        `&#x1f4e8; Batch push result (${validMessages.length} recipients):`,
        result,
      );
      return result;
    } catch (error) {
      console.error("❌ Помилка пакетної відправки push-сповіщень:", error);
      return { error: String(error) };
    }
  },
});

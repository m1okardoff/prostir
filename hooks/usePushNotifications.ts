import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

// Налаштування поведінки сповіщень, коли додаток активний (у фокусі)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const savePushToken = useMutation(api.users.savePushToken);
  const router = useRouter();

  // Офіційний хук Expo для відслідковування взаємодії з останнім сповіщенням (включно з холодним стартом)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Функція навігації за даними зі сповіщення
  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    console.log("&#x1f9ed; Перехід за сповіщенням з даними:", data);

    if (data.conversationId || data.type === "chat") {
      router.push(`/messages/${data.conversationId}`);
    } else if (data.postId || data.type === "like" || data.type === "comment") {
      router.push(`/post/${data.postId}`);
    } else if (data.userId || data.type === "follow") {
      router.push(`/user/${data.userId}`);
    } else {
      router.push("/(tabs)/notifications");
    }
  };

  // Реакція на клік по сповіщенню через хук useLastNotificationResponse
  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      const data = lastNotificationResponse.notification.request.content.data;
      handleNotificationNavigation(data);
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // 1. Реєструємо пристрій та зберігаємо токен у Convex
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        console.log("&#x1f4f2; Отримано Expo Push Token:", token);
        savePushToken({ pushToken: token }).catch((err) => {
          console.error("Помилка збереження pushToken у Convex:", err);
        });
      }
    });

    // 2. Слухач для отримання сповіщень у Foreground
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "&#x1f514; Отримано сповіщення у foreground:",
          notification,
        );
      });

    // 3. Слухач для кліку по сповіщенню, коли додаток у фоні або відкритий
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, isLoading]);
}

/**
 * Отримує дозволи від ОС та повертає ExponentPushToken
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Налаштування каналу для Android (обов'язково перед викликом запиту дозволів на Android 13+)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFFFFF",
      sound: "default",
    });
  }

  // Перевірка поточного статусу дозволів
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Якщо дозвіл ще не запитували — показуємо системний діалог
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("⚠️ Користувач не надав дозвіл на отримання сповіщень");
    return null;
  }

  try {
    // Отримуємо projectId з expoConfig
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn(
        "⚠️ Project ID не знайдено в app.config.ts! Додайте extra.eas.projectId або виконайте 'npx eas project:init'",
      );
    }

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    return tokenData.data;
  } catch (error) {
    console.error("❌ Не вдалося отримати pushToken від Expo:", error);
    return null;
  }
}

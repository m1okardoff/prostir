import { ConfigContext, ExpoConfig } from "expo/config";

// Базові налаштування додатку Prostir
const APP_NAME = "Prostir";
const PACKAGE_NAME = "com.prostir.app";
const SCHEME = "prostir";

export default ({ config }: ConfigContext): ExpoConfig => {
  // Визначаємо поточне середовище (за замовчуванням development)
  const environment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";

  console.log("⚙️  Поточне середовище збірки:", environment);
  console.log("📦 URL бази даних Convex:", process.env.EXPO_PUBLIC_CONVEX_URL);

  const isDev = environment === "development";

  return {
    ...config,
    name: isDev ? `${APP_NAME} Dev` : APP_NAME,
    slug: "prostir",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: isDev ? `${SCHEME}-dev` : SCHEME,
    userInterfaceStyle: "dark",

    ios: {
      supportsTablet: true,
      bundleIdentifier: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      infoPlist: {
        NSMicrophoneUsageDescription:
          "Додатку потрібен доступ до мікрофона для запису та надсилання голосових повідомлень.",
      },
    },

    android: {
      package: isDev ? `${PACKAGE_NAME}.dev` : PACKAGE_NAME,
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#000000",
      },
      // Дозволи для фото та збереження файлів
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
      ],
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-audio",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#000000",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Додатку потрібен доступ до ваших фотографій.",
        },
      ],
      "expo-secure-store",
    ],

    experiments: {
      typedRoutes: true,
    },
  };
};

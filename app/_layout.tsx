import "../global.css";
import InitialLayout from "@/components/InitialLayout";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { Image } from "expo-image";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { cssInterop } from "nativewind";
import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

cssInterop(Image, { className: "style" });

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export default function RootLayout() {
  return (
    <ConvexAuthProvider
      client={convex}
      storage={
        Platform.OS === "android" || Platform.OS === "ios"
          ? secureStorage
          : undefined
      }
    >
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" /> 
        <InitialLayout />
      </SafeAreaView>
    </ConvexAuthProvider>
  );
}

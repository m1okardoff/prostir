import { useEffect } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : "skip"
  );
  const { signOut } = useAuthActions();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || (isAuthenticated && user === undefined)) return;

    const inAuthScreen = segments[0] === "(auth)";

    if (isAuthenticated) {
      if (user === null) {
        // Користувач авторизований у системі автентифікації, але його профіль не знайдено в базі
        void signOut();
        SplashScreen.hideAsync().catch(() => {});
        return;
      }
      if (inAuthScreen) {
        router.replace("/(tabs)");
      }
    } else {
      if (!inAuthScreen) {
        router.replace("/(auth)/login");
      }
    }

    SplashScreen.hideAsync().catch(() => {});
  }, [isAuthenticated, isLoading, user, segments, router, signOut]);

  if (isLoading || (isAuthenticated && user === undefined)) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

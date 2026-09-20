import { useEffect } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function InitialLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signOut } = useAuthActions();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || (isAuthenticated && user === undefined)) return;

    const inAuthScreen = segments[0] === "(auth)";
    const isUserValid = isAuthenticated && user !== null;

    if (isUserValid) {
      if (inAuthScreen) {
        router.replace("/(tabs)");
      }
    } else {
      if (isAuthenticated && user === null) {
        void signOut();
      }
      if (!inAuthScreen) {
        router.replace("/(auth)/login");
      }
    }

    SplashScreen.hideAsync();
  }, [isAuthenticated, isLoading, user, segments, router, signOut]);

  if (isLoading || (isAuthenticated && user === undefined)) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

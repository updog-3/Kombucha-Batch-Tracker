import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect } from "react";
import { View, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { BatchProvider } from "@/context/BatchContext";
import { router } from "expo-router";

const RootView = Platform.OS === 'web' ? View : GestureHandlerRootView;
const MaybeKeyboardProvider = Platform.OS === 'web'
  ? ({ children }: { children: React.ReactNode }) => <>{children}</>
  : KeyboardProvider;

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function RootLayoutNav() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const batchId = response.notification.request.content.data?.batchId;
      if (batchId) {
        router.push({ pathname: "/batch/[id]", params: { id: batchId } });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="batch/[id]"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="new-batch"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RootView style={{ flex: 1 }}>
          <MaybeKeyboardProvider>
            <BatchProvider>
              <RootLayoutNav />
            </BatchProvider>
          </MaybeKeyboardProvider>
        </RootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

import { ContextProvider } from "@/src/providers/contextModule";
import {
  Exo2_400Regular,
  Exo2_700Bold,
  useFonts,
} from "@expo-google-fonts/exo-2";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import ContextLoader from "../providers/contextLoader";

import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

const defaultHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  // Send error to logger or external service, e.g. Sentry or Bugsnag
  console.error(error, isFatal);
  // You can show a custom alert/modal here if you want
  defaultHandler(error, isFatal);
});

export default function RootLayout() {
  let [fontsLoaded] = useFonts({
    Exo2_400Regular,
    Exo2_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }
  return (
    <React.Fragment>
      {
        // This provider provides safe area insets
      }
      <SafeAreaProvider>
        {
          // This provider provides the context to the app
        }
        <ContextProvider>
          {
            // This provider provides metamask connectivity
          }
          <ContextLoader />
          <Stack
            initialRouteName="(screens)/index"
            screenOptions={{
              animation: "simple_push",
              headerShown: false,
            }}
          >
            {
              // Splash Loading Screen
            }
            <Stack.Screen name="(screens)/index" />
            {
              // Setup Screen
            }
            <Stack.Screen name="(screens)/create" />
            {
              // Main Screen
            }
            <Stack.Screen name="(screens)/main" />
            {
              // Receipt Screen
            }
            <Stack.Screen name="(screens)/receipt" />
          </Stack>
          <StatusBar style="auto" />
        </ContextProvider>
      </SafeAreaProvider>
    </React.Fragment>
  );
}

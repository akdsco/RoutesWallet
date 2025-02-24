import "../app/global.css";
import React from "react";
import * as SplashScreen from "expo-splash-screen";
import { AppThemeProvider } from "@/providers/Theme";
import { AppProvider } from "@/providers/App";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/db/dbInit";
import { Slot } from "expo-router";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/library/Toast";
import { MenuProvider } from "react-native-popup-menu";
import { ElementsProvider } from "@/providers/ElementsProvider";
import { PostHogProvider } from "posthog-react-native";
import { postHog } from "@/library/analytics/posthog";
import { isProduction } from "@/library/config";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://e56d79cac77ee2deeb7a2fa22ba45102@o4508873874604032.ingest.de.sentry.io/4508873876242512",

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().then();

export default function Root() {
  return (
    <SQLiteProvider databaseName="routeswalletdb" onInit={migrateDbIfNeeded}>
      <AppProvider>
        <AppThemeProvider>
          <PostHogProvider client={postHog} autocapture={isProduction}>
            <ElementsProvider>
              <MenuProvider>
                <Slot />
                <Toast config={toastConfig} />
              </MenuProvider>
            </ElementsProvider>
          </PostHogProvider>
        </AppThemeProvider>
      </AppProvider>
    </SQLiteProvider>
  );
}

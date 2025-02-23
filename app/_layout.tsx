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
import { postHog } from "@/library/posthog";
import { isProduction } from "@/library/config";

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

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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  return (
    <SQLiteProvider databaseName="routeswalletdb" onInit={migrateDbIfNeeded}>
      <AppProvider>
        <AppThemeProvider>
          <Slot />
          <Toast config={toastConfig} />
        </AppThemeProvider>
      </AppProvider>
    </SQLiteProvider>
  );
}

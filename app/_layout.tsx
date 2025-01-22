import "../app/global.css";
import React from "react";
import * as SplashScreen from "expo-splash-screen";
import { AppThemeProvider } from "@/providers/Theme";
import { AppProvider } from "@/providers/App";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/constants/dbInit";
import { Slot } from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  return (
    <SQLiteProvider databaseName="routeswalletdb" onInit={migrateDbIfNeeded}>
      <AppProvider>
        <AppThemeProvider>
          <Slot />
        </AppThemeProvider>
      </AppProvider>
    </SQLiteProvider>
  );
}

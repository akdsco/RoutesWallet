import "../app/global.css";
import React from "react";
import { AppThemeProvider } from "@/providers/Theme";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/constants/dbInit";
import { App } from "@/containers/App/App";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  return (
    <SQLiteProvider databaseName="routeswalletdb" onInit={migrateDbIfNeeded}>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </SQLiteProvider>
  );
}

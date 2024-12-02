import { Slot } from "expo-router";
import { AppThemeProvider } from "@/providers/Theme";
import * as SplashScreen from "expo-splash-screen";
import { useLoading } from "@/hooks";
import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { migrateDbIfNeeded } from "@/constants/dbInit";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().then();

export default function RootLayout() {
  useLoading();

  return (
    <SQLiteProvider databaseName="local.db" onInit={migrateDbIfNeeded}>
      <AppThemeProvider>
        <Slot />
        <StatusBar style="auto" />
      </AppThemeProvider>
    </SQLiteProvider>
  );
}

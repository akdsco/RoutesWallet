import { Slot } from "expo-router";
import { AppThemeProvider } from "@/providers/Theme";
import { FirebaseProvider } from "@/providers/Firebase";
import * as SplashScreen from "expo-splash-screen";
import { useLoading } from "@/hooks";
import { StatusBar } from "expo-status-bar";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().then();

export default function RootLayout() {
  useLoading();

  return (
    <FirebaseProvider>
      <AppThemeProvider>
        <Slot />
        <StatusBar style="auto" />
      </AppThemeProvider>
    </FirebaseProvider>
  );
}

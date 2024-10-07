import { Stack } from "expo-router";
import { AppThemeProvider } from "@/providers/Theme";
import * as SplashScreen from "expo-splash-screen";
import { useLoading } from "@/hooks";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync().then();

export default function RootLayout() {
  const loading = useLoading();
  if (!loading) {
    return null;
  }

  return (
    <AppThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AppThemeProvider>
  );
}

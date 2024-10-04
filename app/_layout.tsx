import { Stack } from "expo-router";
import { AppThemeProvider } from "@/providers/Theme";

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </AppThemeProvider>
  );
}

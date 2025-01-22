import { Redirect, Stack } from "expo-router";
import { useApp } from "@/hooks";
import { ThemedText } from "@/components/ThemedText";

export default function Layout() {
  const { isStravaAuthed, loading } = useApp();

  if (loading) {
    // TODO: improve
    return <ThemedText>Loading</ThemedText>;
  }

  if (!isStravaAuthed) {
    console.debug("Redirecting to /sign-in", `isAppAuthed: ${isStravaAuthed}`);
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

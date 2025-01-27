import { Redirect, Stack } from "expo-router";
import { useApp } from "@/hooks";

export default function Layout() {
  const { loading, isStravaAuthed } = useApp();

  if (!loading && !isStravaAuthed) {
    console.debug(
      "Redirecting to /sign-in",
      `Is application authenticated? ${isStravaAuthed}`,
    );
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

import { Redirect, Stack } from "expo-router";
import { useApp } from "@/hooks";
import { log } from "@/library/logger";

export default function Layout() {
  const { loading, isStravaAuthed } = useApp();

  if (!loading && !isStravaAuthed) {
    log.debug("rootAppLayout", "Redirecting to /sign-in", {
      loading,
      isStravaAuthed,
    });
    return <Redirect href="/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

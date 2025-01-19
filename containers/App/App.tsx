import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Authorise from "@/app/authorise";
import React from "react";
import { useLoading } from "@/hooks";

export const App = () => {
  const { isStravaAuthed } = useLoading();

  if (!isStravaAuthed) {
    return <Authorise />;
  }

  return (
    <Stack>
      <StatusBar style="auto" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

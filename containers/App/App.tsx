import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Authorise from "@/app/authorise";
import React from "react";
import { useApp } from "@/hooks";

export const App = () => {
  const { isStravaAuthed, routesAvailable } = useApp();

  if (!isStravaAuthed && !routesAvailable) {
    return <Authorise />;
  }

  return (
    <Stack>
      <StatusBar style="auto" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

import { Pressable, Text, View } from "react-native";
import { Logo } from "@/components/Logo/Logo";
import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { initStravaAuth } from "@/auth/strava";

export default function Index() {
  const [theme] = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.background,
      }}
    >
      <Logo />
      {/*<Text style={{ color: theme.text }}> Hello </Text>*/}
      <Pressable onPress={initStravaAuth}>
        <Text>Sync your Strava</Text>
      </Pressable>
    </View>
  );
}

import { Text, View } from "react-native";
import { Logo } from "@/components/Logo/Logo";
import React from "react";
import { useTheme } from "@/hooks/useTheme";

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
    </View>
  );
}

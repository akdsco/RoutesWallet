import React from "react";
import { Logo } from "@/components/Logo/Logo";
import { View } from "react-native";
import { useTheme } from "@/hooks";

export const Loader = () => {
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
};

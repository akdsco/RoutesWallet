import React, { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { SafeAreaView, View } from "react-native";

export const HomeScreen = ({ children }: { children: ReactNode }) => {
  const [theme] = useTheme();

  return (
    <SafeAreaView
      style={{
        display: "flex",
        flexGrow: 1,
        backgroundColor: theme.background,
        alignItems: "center",
      }}
    >
      <View style={{ maxWidth: 960 }}>{children}</View>
    </SafeAreaView>
  );
};

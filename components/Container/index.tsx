import React, { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Platform, SafeAreaView, View } from "react-native";

const Container = ({ children }: { children: ReactNode }) => {
  const [theme] = useTheme();

  return (
    <SafeAreaView
      style={{
        display: "flex",
        flexGrow: 1,
        backgroundColor: theme.background,
        alignItems: "center",
        marginTop: Platform.OS === "android" ? 30 : undefined,
      }}
    >
      <View style={{ maxWidth: 1200 }}>{children}</View>
    </SafeAreaView>
  );
};

export default Container;

import React, { ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Platform, SafeAreaView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const Container = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView>
      <SafeAreaView
        style={{
          display: "flex",
          flexGrow: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          marginTop: Platform.OS === "android" ? 30 : undefined,
        }}
      >
        <View style={{ maxWidth: 1200, padding: 10 }}>{children}</View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Container;

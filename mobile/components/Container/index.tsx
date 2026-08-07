import React, { PropsWithChildren } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Platform, SafeAreaView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type ContainerProps = PropsWithChildren & {
  noCenter?: boolean;
};

const Container = ({ children, noCenter }: ContainerProps) => {
  const { theme } = useTheme();

  return (
    <GestureHandlerRootView>
      <SafeAreaView
        style={{
          flex: 1,
          display: "flex",
          flexGrow: 1,
          backgroundColor: theme.background,
          alignItems: noCenter ? undefined : "center",
          marginTop: Platform.OS === "android" ? 30 : undefined,
        }}
      >
        <View style={{ flex: 1, margin: 5 }}>{children}</View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Container;

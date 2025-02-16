import React, { PropsWithChildren } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Platform, SafeAreaView, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type ContainerProps = PropsWithChildren;

const Container = ({ children }: ContainerProps) => {
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
        <View style={{ margin: 5 }}>{children}</View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Container;

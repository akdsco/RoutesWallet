import { Platform, View } from "react-native";

import { Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import * as WebBrowser from "expo-web-browser";
import { useStravaAuthButton } from "@/containers/StravaAuth/StravaAuthButton.hook";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

export const StravaAuthButton = () => {
  const { request, promptAsync } = useStravaAuthButton();

  return (
    <Pressable disabled={!request} onPress={() => promptAsync()}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#fc4c02",
          padding: 20,
        }}
      >
        <View style={{ marginRight: 15 }}>
          <LogoStravaSquare width={40} height={40} />
        </View>
        <ThemedText>Sign in with Strava</ThemedText>
      </View>
    </Pressable>
  );
};

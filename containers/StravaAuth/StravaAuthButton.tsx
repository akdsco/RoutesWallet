import { Platform, View } from "react-native";

import { Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import * as WebBrowser from "expo-web-browser";
import { AuthRequest } from "expo-auth-session";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

type StravaAuthButtonProps = {
  request: AuthRequest | null;
  promptAsync: () => void;
};

export const StravaAuthButton = ({
  request,
  promptAsync,
}: StravaAuthButtonProps) => {
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

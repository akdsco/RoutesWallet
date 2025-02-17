import { Platform, Pressable, View } from "react-native";
import { ConnectWithStravaSvg } from "@/components/Logo/Strava";
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
          justifyContent: "center",
          padding: 14,
        }}
      >
        <ConnectWithStravaSvg />
      </View>
    </Pressable>
  );
};

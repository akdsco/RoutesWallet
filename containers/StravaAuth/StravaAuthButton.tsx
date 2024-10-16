import { View } from "react-native";

import { useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { appConfig } from "@/constants/config";

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
  revocationEndpoint: "https://www.strava.com/oauth/deauthorize",
};

export const StravaAuthButton = () => {
  console.log("StravaAuthButton");

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: appConfig.stravaClientId,
      scopes: ["activity:read_all"],
      redirectUri: makeRedirectUri({
        // the "redirect" must match your "Authorization Callback Domain" in the Strava dev console.
        // native: "routeswallet://localhost?platform_type=strava",
        path: "localhost?platform_type=strava",
        scheme: "routeswallet",
      }),
    },
    discovery
  );

  useEffect(() => {
    console.log(
      "StravaAuthButton response: ",
      JSON.stringify(response, undefined, 2)
    );

    if (response?.type === "success") {
      const { code } = response.params;

      console.log("2) Strava auth code: ", code);
    }
  }, [response]);

  return (
    <Pressable
      disabled={!request}
      onPress={() => {
        console.log(
          "1) Strava auth request: ",
          JSON.stringify(request, undefined, 2)
        );
        return promptAsync();
      }}
      style={{ marginTop: 140 }}
    >
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
        <ThemedText>Add routes from Strava</ThemedText>
      </View>
    </Pressable>
  );
};

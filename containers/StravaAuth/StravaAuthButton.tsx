import { Platform, View } from "react-native";

import { useEffect } from "react";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { appConfig } from "@/constants/config";
import * as WebBrowser from "expo-web-browser";
import { handleStravaAuthorisation } from "@/auth/strava";

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

const discovery = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
  revocationEndpoint: "https://www.strava.com/oauth/deauthorize",
};

export const StravaAuthButton = () => {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: appConfig.stravaClientId,
      scopes: ["activity:read_all"],
      redirectUri: makeRedirectUri({
        // the "redirect" must match your "Authorization Callback Domain" in the Strava dev console.
        native: "routeswallet://localhost",
        // scheme: "routeswallet",
      }),
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      console.log("2) Strava auth response: ", response);

      const { code, scope } = response.params;
      handleStravaAuthorisation(code, scope);
    }

    if (response?.type === "error") {
      console.error("Error when authorising Strava: ", response.error);
    }
  }, [response]);

  const startStravaAuth = () => {
    console.log(
      "1) Strava auth request: ",
      JSON.stringify(request, undefined, 2)
    );
    return promptAsync();
  };

  return (
    <Pressable
      disabled={!request}
      onPress={startStravaAuth}
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

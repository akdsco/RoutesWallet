import { Platform, View } from "react-native";

import { useEffect } from "react";
import { makeRedirectUri, useAuthRequest } from "expo-auth-session";
import { Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { LogoStravaSquare } from "@/components/Logo/Strava";
import { appConfig } from "@/constants/config";
import * as WebBrowser from "expo-web-browser";
import { useStravaAuthButton } from "@/containers/StravaAuth/StravaAuthButton.hook";

const discovery = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
  revocationEndpoint: "https://www.strava.com/oauth/deauthorize",
};

// TODO: check below scope, is it really not possible to use it?
// "profile:read_all"

const authRequestInit = {
  clientId: appConfig.stravaClientId,
  scopes: ["activity:read_all"],
  redirectUri: makeRedirectUri({
    // the "redirect" must match your "Authorization Callback Domain" in the Strava dev console.
    native: "routeswallet://localhost",
    // scheme: "routeswallet",
  }),
};

if (Platform.OS === "web") {
  WebBrowser.maybeCompleteAuthSession();
}

export const StravaAuthButton = () => {
  const [request, response, promptAsync] = useAuthRequest(
    authRequestInit,
    discovery,
  );
  const { handleStravaResponse } = useStravaAuthButton();

  useEffect(() => {
    if (response) {
      handleStravaResponse(response).then();
    }
  }, [response]);

  return (
    <Pressable
      disabled={!request}
      onPress={() => promptAsync()}
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

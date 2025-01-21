import {
  AuthSessionResult,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { handleStravaAuthorisation, saveStravaRoutesInDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { useRouter } from "expo-router";
import { stravaApiDiscovery } from "@/auth/strava";
import Config from "react-native-config";
import { useEffect } from "react";

// TODO: check below scope, is it really not possible to use it?
// "profile:read_all"
const authRequestInit = {
  clientId: Config.STRAVA_CLIENT_ID,
  scopes: ["activity:read_all"],
  redirectUri: makeRedirectUri({
    // the "redirect" must match your "Authorization Callback Domain" in the Strava dev console.
    native: "routeswallet://localhost",
    // scheme: "routeswallet",
  }),
};

export const useStravaAuthButton = () => {
  const db = useSQLiteContext();
  const router = useRouter();

  const [request, response, promptAsync] = useAuthRequest(
    authRequestInit,
    stravaApiDiscovery,
  );

  useEffect(() => {
    if (response) {
      handleStravaResponse(response).then();
    }
  }, [response]);

  const handleStravaResponse = async (response: AuthSessionResult) => {
    if (response?.type === "error") {
      console.error("Error when authorising Strava: ", response.error);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      console.log(`User ${response?.type}ed the auth flow`);
    }

    if (response?.type === "success") {
      console.debug("Strava auth response: ", response);

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        // TODO: "scope is not as expected, send user back to auth page", improve scope checking
        console.error("Scope is not as expected, send user back to auth page");
        return;
      }

      const athleteId = await handleStravaAuthorisation(db)(code, scope);
      await saveStravaRoutesInDb(db)(athleteId);

      console.log("Redirecting to routes screen (tabs index screen)");
      router.replace("/(tabs)/");
    }
  };

  return {
    request,
    promptAsync,
  };
};

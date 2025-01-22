import {
  AuthSessionResult,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import { handleStravaAuthorisation, saveStravaRoutesInDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { stravaApiDiscovery } from "@/auth/strava";
import Config from "react-native-config";
import { useEffect, useState } from "react";
import { useApp } from "@/hooks";
import { useRouter } from "expo-router";

// TODO: check below scope, is it really not possible to use it?
// "profile:read_all"
const requestConfig = {
  clientId: Config.STRAVA_CLIENT_ID,
  scopes: ["activity:read_all"],
  redirectUri: makeRedirectUri({
    // the "redirect" must match your "Authorization Callback Domain" in the Strava dev console.
    native: "routeswallet://localhost",
    // scheme: "routeswallet",
  }),
};

export const useStravaAuthButton = () => {
  const [authenticating, setAuthenticating] = useState(false);
  const db = useSQLiteContext();
  const router = useRouter();
  const { setIsStravaAuthed } = useApp();

  const [request, response, promptAsync] = useAuthRequest(
    requestConfig,
    stravaApiDiscovery,
  );

  useEffect(() => {
    if (response) {
      setAuthenticating(true);
      console.debug("UseEffect response exists: ", response);
      // TODO: Use loader when async prompt works below (better UX)?
      handleStravaResponse(response)
        .then(() => {
          console.info("Strava auth response handled");
          setAuthenticating(false);
          router.replace("/");
        })
        .catch((e) => {
          setAuthenticating(false);
          console.error("Error when handling Strava's auth response", e);
        });
    }
  }, [response]);

  const handleStravaResponse = async (response: AuthSessionResult) => {
    if (response?.type === "error") {
      console.error("Error when authorising Strava: ", response.error);
      // TODO: Inform user?
      throw new Error(response.error?.message);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      // TODO: Inform user?
      console.info(`User ${response?.type}ed Strava authentication flow`);
      return;
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
      const routes = await saveStravaRoutesInDb(db)(athleteId);

      console.debug(`Saved ${routes.length} routes`);
      setIsStravaAuthed(true);
    }
  };

  return {
    request,
    authenticating,
    promptAsync,
  };
};

import {
  AuthSessionResult,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import {
  handleStravaAuthorisation,
  saveStravaRoutesInDb,
  stravaApiDiscovery,
} from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import Config from "react-native-config";
import { useEffect } from "react";
import { useApp } from "@/hooks";
import { useRouter } from "expo-router";
import { log } from "@/library/logger";

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
  const db = useSQLiteContext();
  const router = useRouter();
  const { setLoading, setIsAuthenticating, setIsStravaAuthed } = useApp();

  const [request, response, promptAsync] = useAuthRequest(
    requestConfig,
    stravaApiDiscovery,
  );

  const setSyncedAuthAndLoading = (value: boolean) => {
    setIsAuthenticating(value);
    setLoading(value);
  };

  useEffect(() => {
    if (response) {
      setSyncedAuthAndLoading(true);
      log.debug(
        "useStravaAuthButton",
        "useEffect strava authorisation response",
        { response },
      );
      // TODO: Use loader when async prompt works below (better UX)?
      handleStravaResponse(response)
        .then(() => {
          console.info("Strava auth response handled");
          setTimeout(() => setSyncedAuthAndLoading(false), 300);
          router.replace("/");
        })
        .catch((error) => {
          setSyncedAuthAndLoading(false);
          log.error(
            "useStravaAuthButton",
            "Error when handling Strava's authorisation response",
            { error },
          );
        });
    }
  }, [response]);

  const handleStravaResponse = async (response: AuthSessionResult) => {
    if (response?.type === "error") {
      log.error(
        "handleStravaResponse",
        "Strava authorisation response returns error",
        { response },
      );
      // TODO: Inform user?
      throw new Error(response.error?.message);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      // TODO: Inform user?
      log.info(
        "handleStravaResponse",
        `User ${response?.type}ed Strava authentication flow`,
      );
      return;
    }

    if (response?.type === "success") {
      log.debug("handleStravaResponse", "Strava auth response successful", {
        response,
      });

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        // TODO: "scope is not as expected, send user back to auth page", improve scope checking
        log.error(
          "handleStravaResponse",
          "Scope is not as expected, send user back to auth page",
          { scope },
        );
        return;
      }

      const athleteId = await handleStravaAuthorisation(db)(code, scope);
      const routes = await saveStravaRoutesInDb(db)(athleteId);

      log.debug("handleStravaResponse", `Saved ${routes.length} routes`, {
        athleteId,
      });
      setIsStravaAuthed(true);
    }
  };

  return {
    request,
    promptAsync,
  };
};

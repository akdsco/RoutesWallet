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
import { useEffect } from "react";
import { useApp } from "@/hooks";
import { useRouter } from "expo-router";
import { log } from "@/library/logger";
import { Toast } from "@/library/Toast";
import { AppConfig } from "@/library/config";

const requestConfig = {
  clientId: AppConfig.STRAVA_CLIENT_ID,
  scopes: ["activity:read_all"],
  redirectUri: makeRedirectUri({
    native: AppConfig.STRAVA_REDIRECT_URI,
  }),
};

export const useStravaAuthButton = () => {
  const fnName = "useStravaAuthButton";
  const db = useSQLiteContext();
  const router = useRouter();
  const { setLoading, setIsAuthenticating, setIsStravaAuthed } = useApp();

  const [request, response, promptAsync] = useAuthRequest(
    requestConfig,
    stravaApiDiscovery,
  );

  const setInProgress = (value: boolean) => {
    setIsAuthenticating(value);
    setLoading(value);
  };

  useEffect(() => {
    if (response) {
      setInProgress(true);
      log.debug(fnName, "useEffect strava authorisation response", {
        response,
      });
      handleStravaResponse(response)
        .then((response) => {
          log.info(fnName, "Strava auth response handled", { response });
          setTimeout(() => setInProgress(false), 300);

          router.replace("/");
        })
        .catch((error) => {
          setInProgress(false);
          log.error(
            fnName,
            "Error when handling Strava's authorisation response",
            { error },
          );
        });
    }
  }, [response]);

  const handleStravaResponse = async (response: AuthSessionResult) => {
    const fnName = "handleStravaResponse";

    if (response?.type === "error") {
      log.error(fnName, "Strava authorisation response returns error", {
        response,
      });
      // TODO: Inform user?
      throw new Error(response.error?.message);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      // TODO: Inform user?
      log.info(fnName, `User ${response?.type}ed Strava authentication flow`);
      return;
    }

    if (response?.type === "success") {
      log.debug(fnName, "Strava auth response successful", {
        response,
      });

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        // TODO: "scope is not as expected, send user back to auth page", improve scope checking
        Toast(
          "error",
          "Selected permissions are not valid",
          "Please allow access to read all activities",
        );
        log.error(fnName, "Scope is not as expected, user should auth again", {
          scope,
        });
        throw new Error("Scope is not as expected");
      }

      const athleteId = await handleStravaAuthorisation(db)(code, scope);
      const routes = await saveStravaRoutesInDb(db)(athleteId);

      log.debug(fnName, `Saved ${routes.length} routes`, {
        athleteId,
      });
      setIsStravaAuthed(true);

      return response;
    }
  };

  return {
    request,
    promptAsync,
  };
};

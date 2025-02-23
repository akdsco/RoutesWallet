import {
  AuthSessionResult,
  makeRedirectUri,
  useAuthRequest,
} from "expo-auth-session";
import {
  getStravaRoutesAndSaveInDb,
  handleStravaAuthorisation,
  stravaApiDiscovery,
} from "@/integrations/strava";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect } from "react";
import { useApp } from "@/hooks";
import { useRouter } from "expo-router";
import { log } from "@/library/logger";
import { Toast } from "@/library/Toast";
import { AppConfig } from "@/library/config";
import { usePostHog } from "posthog-react-native";

const redirectUri = makeRedirectUri({
  scheme: "routeswallet",
  path: AppConfig.STRAVA_REDIRECT_URI,
});

const requestConfig = {
  clientId: AppConfig.STRAVA_CLIENT_ID,
  scopes: ["activity:read_all"],
  redirectUri,
};

export const useStravaAuthButton = () => {
  const fnName = "useStravaAuthButton";
  const db = useSQLiteContext();
  const postHog = usePostHog();
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
          log.debug(fnName, "Strava auth response handled", { response });
          setTimeout(() => setInProgress(false), 300);

          router.replace("/");
        })
        .catch((error) => {
          if (error.message === "User cancelled Strava auth flow") {
            setInProgress(false);
            Toast("info", "Strava authorisation cancelled", "Please try again");
            return router.navigate("/sign-in");
          }

          if (error.message === "access_denied") {
            setInProgress(false);
            log.info(fnName, "User denied Strava authorisation");
            Toast(
              "warning",
              "Strava authorisation cancelled",
              "Access was denied, please try again",
            );
            return router.navigate("/sign-in");
          }

          if (error.message === "Scope is not as expected") {
            setInProgress(false);
            Toast(
              "warning",
              "Permissions required",
              "Access to read all activities is essential to get your routes",
            );
            return router.navigate("/sign-in");
          }

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
      throw new Error(response.error?.code);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      log.info(fnName, `User ${response?.type}ed Strava authentication flow`);
      throw new Error("User cancelled Strava auth flow");
    }

    if (response?.type === "success") {
      log.debug(fnName, "Strava auth response successful", {
        response,
      });

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        log.warn(fnName, "Selected permissions are not valid", { scope });
        throw new Error("Scope is not as expected");
      }

      const athleteId = await handleStravaAuthorisation(db, postHog)(
        code,
        scope,
      );
      log.info(fnName, "User logged in successfully with Strava", {
        athleteId,
      });

      await getStravaRoutesAndSaveInDb(db)(athleteId);

      setIsStravaAuthed(true);

      return response;
    }
  };

  return {
    request,
    promptAsync,
  };
};

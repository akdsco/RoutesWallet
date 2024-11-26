import { AuthSessionResult } from "expo-auth-session";
import { saveStravaRoutesInDb, handleStravaAuthorisation } from "@/auth/strava";

export const useStravaAuthButton = () => {
  const handleStravaResponse = async (response: AuthSessionResult) => {
    if (response?.type === "error") {
      console.error("Error when authorising Strava: ", response.error);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      console.log(`User ${response?.type}ed the auth flow`);
    }

    if (response?.type === "success") {
      console.debug("2: Strava auth response: ", response);

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        // TODO: "scope is not as expected, send user back to auth page", improve scope checking
        console.log("Scope is not as expected, send user back to auth page");
        return;
      }

      const db = {};

      const athleteId = await handleStravaAuthorisation(db)(code, scope);

      const routes = await saveStravaRoutesInDb(db)(athleteId);

      if (!routes.length) {
        console.log("No routes found after authorising with Strava");
        // TODO: "No routes found, notify user and send them back to auth page?"
        return;
      }

      console.log("Should redirect to routes screen");

      //   TODO redirect user to routes screen ?
    }
  };

  return {
    handleStravaResponse,
  };
};

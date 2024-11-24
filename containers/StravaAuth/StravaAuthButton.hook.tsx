import { AuthSessionResult } from "expo-auth-session";
import { getStravaRoutes, handleStravaAuthorisation } from "@/auth/strava";
import { StravaRoute } from "@/auth/strava/types";

export const useStravaAuthButton = () => {
  const handleStravaResponse = async (response: AuthSessionResult) => {
    if (response?.type === "success") {
      console.debug("2: Strava auth response: ", response);

      const { code, scope } = response.params;

      if (scope !== "read,activity:read_all") {
        // TODO: "scope is not as expected, send user back to auth page", improve scope checking
        console.log("Scope is not as expected, send user back to auth page");
        return;
      }

      const { athlete } = await handleStravaAuthorisation(code, scope);

      const routes = await getStravaRoutes(athlete.id);

      if (!routes.length) {
        console.log("No routes found after authorising with Strava");
        // TODO: "No routes found, notify user and send them back to auth page?"
        return;
      }

      await saveStravaRoutes(athlete.id, routes);
    }

    if (response?.type === "error") {
      console.error("Error when authorising Strava: ", response.error);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      console.log(`User ${response?.type}ed the auth flow`);
    }
  };

  const saveStravaRoutes = async (athleteId: number, routes: StravaRoute[]) => {
    try {
      await Promise.all(
        routes.map(async (route) => {
          // TODO: save routes to database
        }),
      );
    } catch (error) {
      console.error(`Error when saving routes for ${athleteId}: `, error);
    }
  };

  return {
    handleStravaResponse,
  };
};

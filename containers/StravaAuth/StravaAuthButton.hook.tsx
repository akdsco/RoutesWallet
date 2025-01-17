import { AuthSessionResult } from "expo-auth-session";
import { handleStravaAuthorisation, saveStravaRoutesInDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { useRouter } from "expo-router";

export const useStravaAuthButton = () => {
  const db = useSQLiteContext();
  const router = useRouter();

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

      const athleteId = await handleStravaAuthorisation(db)(code, scope);
      await saveStravaRoutesInDb(db)(athleteId);

      console.log("Redirecting to routes screen");
      router.navigate("/routes");
    }
  };

  return {
    handleStravaResponse,
  };
};

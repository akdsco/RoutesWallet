import { PostHog } from "posthog-react-native";
import { StravaAthleteBasic } from "@/integrations/strava";
import { log } from "@/library/logger";
import { isProduction } from "@/library/config";

export const registerUser =
  (postHog: PostHog) => async (athlete: StravaAthleteBasic) => {
    if (isProduction) {
      log.info("registerUser", "Registering user", { athlete });
    }

    postHog.identify(athlete.id.toString(), {
      $set: {
        user: athlete.username,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        fullName: `${athlete.firstname} ${athlete.lastname}`,
      },
      $set_once: {
        firstLogin: new Date(),
      },
    });
  };

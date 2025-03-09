import { PostHog } from "posthog-react-native";
import { StravaAthleteBasic } from "@/integrations/strava";
import { log } from "@/library/logger";
import { isProduction } from "@/library/config";
import * as Sentry from "@sentry/browser";

export const registerUser =
  (postHog: PostHog) => async (athlete?: StravaAthleteBasic) => {
    if (!athlete) {
      return;
    }

    if (isProduction) {
      log.info("registerUser", "Registering user", { athlete });
    }

    const fullName = `${athlete.firstname} ${athlete.lastname}`;

    postHog.identify(athlete.id.toString(), {
      $set: {
        user: athlete.username,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        fullName,
      },
      $set_once: {
        firstLogin: new Date(),
      },
    });

    Sentry.setUser({ id: athlete.id, username: fullName });
  };

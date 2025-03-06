import Constants from "expo-constants";

const AppConfig = {
  APP_ENV: Constants.expoConfig?.extra?.APP_ENV || process.env.APP_ENV,
  DEBUG_MODE: Constants.expoConfig?.extra?.DEBUG_MODE || process.env.DEBUG_MODE,
  DEBUG_MODE_VERBOSE:
    Constants.expoConfig?.extra?.DEBUG_MODE_VERBOSE ||
    process.env.DEBUG_MODE_VERBOSE,
  STRAVA_CLIENT_ID:
    Constants.expoConfig?.extra?.STRAVA_CLIENT_ID ||
    process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET:
    Constants.expoConfig?.extra?.STRAVA_CLIENT_SECRET ||
    process.env.STRAVA_CLIENT_SECRET,
  STRAVA_REDIRECT_URI:
    Constants.expoConfig?.extra?.STRAVA_REDIRECT_URI ||
    process.env.STRAVA_REDIRECT_URI,
  POSTHOG_API_KEY:
    Constants.expoConfig?.extra?.POSTHOG_API_KEY || process.env.POSTHOG_API_KEY,
};

const isProduction = AppConfig.APP_ENV === "production";

export { AppConfig, isProduction };

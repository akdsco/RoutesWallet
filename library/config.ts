import Constants from "expo-constants";

const AppConfig = {
  DEBUG_MODE: Constants.expoConfig?.extra?.DEBUG_MODE,
  STRAVA_CLIENT_ID: Constants.expoConfig?.extra?.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: Constants.expoConfig?.extra?.STRAVA_CLIENT_SECRET,
  STRAVA_REDIRECT_URI: Constants.expoConfig?.extra?.STRAVA_REDIRECT_URI,
};

export { AppConfig };

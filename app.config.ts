import "dotenv/config";

export default {
  extra: {
    eas: {
      projectId: "6a53160b-99d0-4c40-bed4-00358d699f94",
    },
    DEBUG_MODE: process.env.DEBUG_MODE,
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
    STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI,
  },
};

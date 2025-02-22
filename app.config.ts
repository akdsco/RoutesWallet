import "dotenv/config";
import { ExpoConfig } from "@expo/config";

const config: ExpoConfig = {
  name: "Routes Wallet",
  slug: "routeswallet",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "routeswallet",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/images/splash.png",
    resizeMode: "cover",
    backgroundColor: "#11111f",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "tech.akds.routeswallet",
    associatedDomains: [
      "applinks:routeswallet.app",
      "applinks:routeswallet.app",
    ],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "tech.akds.routeswallet",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "*.routeswallet.app",
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "server",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-sqlite",
      {
        enableFTS: true,
        useSQLCipher: true,
        android: {
          enableFTS: false,
          useSQLCipher: false,
        },
        ios: {
          customBuildFlags: [
            "-DSQLITE_ENABLE_DBSTAT_VTAB=1 -DSQLITE_ENABLE_SNAPSHOT=1",
          ],
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  owner: "akdsco",
  extra: {
    eas: {
      projectId: "6a53160b-99d0-4c40-bed4-00358d699f94",
    },
    DEBUG_MODE: process.env.DEBUG_MODE,
    DEBUG_MODE_VERBOSE: process.env.DEBUG_MODE_VERBOSE,
    STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
    STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
    STRAVA_REDIRECT_URI: process.env.STRAVA_REDIRECT_URI,
  },
};

export default config;

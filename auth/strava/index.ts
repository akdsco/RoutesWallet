import { appConfig } from "@/constants/config";
import { Linking, Platform } from "react-native";
import { StravaAuthResponse, StravaRoute } from "@/auth/strava/types";

export const initStravaAuth = () => {
  // TODO: check if user is using android/ios or web and based on that use appropriate authentication code

  let url = new URL("https://www.strava.com/oauth/authorize");

  if (Platform.OS === "ios") {
    // TODO: Work in progress
  }

  if (Platform.OS === "android") {
    url = new URL("https://www.strava.com/oauth/mobile/authorize");
    // url.searchParams.set("approval_prompt", "auto");
    url.searchParams.set("redirect_uri", appConfig.stravaRedirect.android);
  }

  if (Platform.OS === "web") {
    url.searchParams.set("redirect_uri", appConfig.stravaRedirect.web);
  }

  // Set most important query params
  url.searchParams.set("client_id", appConfig.stravaClientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "activity:read_all");

  console.log("About to link to Strava APP: ", url.toString());

  // Open the browser to the Strava authorisation page
  Linking.openURL(url.toString()).catch(console.error);
};

export const handleStravaAuthorisation = async (searchParams: URLSearchParams) => {
  const error = searchParams.get("error");
  const code = searchParams.get("code");

  if (!code && !error) {
    return;
  }

  if (error || !code) {
    console.error("Error when authorising Strava: ", error);

    // TODO: Handle error or no authorisation scenario
    return new Response("Error");
  }

  console.log("Strava: Authorisation code: ", code);
  console.log("Strava: Authorisation scope: ", searchParams.get("scope"));

  const stravaAuth = await getStravaAuthResponse(code);
  console.log("Strava: Auth response: ", stravaAuth);

  // TODO: Save the Strava auth response to the user's account
  const routes = await getStravaRoutes(stravaAuth.access_token)(
    stravaAuth.athlete.id,
  );

  console.log(routes);

  return new Response("Strava: Authorised successfully");
};

const getStravaAuthResponse = async (code: string) => {
  const url = new URL("https://www.strava.com/oauth/token");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", appConfig.stravaClientId);
  url.searchParams.set(
    "client_secret",
    "ec3d9679315852b95d3bd4222dc4f4ca5262009b",
  );
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url.toString(), {
    method: "POST",
  });

  return (await response.json()) as StravaAuthResponse;
};

const getStravaRoutes = (accessToken: string) => async (athleteId: number) => {
  const url = new URL(
    `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
  );

  // TODO: is this data being paged? fix it so we always get all
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (await response.json()) as StravaRoute[];
};

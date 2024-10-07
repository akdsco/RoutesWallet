import { appConfig } from "@/constants/config";
import { Linking } from "react-native";
import { StravaAuthResponse } from "@/auth/strava/types";

export const initStravaAuth = () => {
  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", appConfig.stravaClientId);
  url.searchParams.set("redirect_uri", appConfig.stravaRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "activity:read_all");

  // Open the browser to the Strava authorisation page
  Linking.openURL(url.toString()).catch(console.error);
};

export const handleStravaAuthorisation = async (urlParams: URLSearchParams) => {
  const error = urlParams.get("error");
  const code = urlParams.get("code");

  if (error || !code) {
    console.error("Error when authorising Strava: ", error);

    // TODO: Handle error or no authorisation
    return new Response("Error");
  }

  console.log("Strava: Authorisation code: ", code);
  console.log("Strava: Authorisation scope: ", urlParams.get("scope"));

  const stravaAuth = await getStravaAuthResponse(code);
  console.log("Strava: Auth response: ", stravaAuth);

  // TODO: Save the Strava auth response to the user's account

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

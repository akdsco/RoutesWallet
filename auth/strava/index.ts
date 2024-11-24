import { appConfig } from "@/constants/config";
import { StravaAuthResponse, StravaRoute } from "@/auth/strava/types";

export const handleStravaAuthorisation = async (
  code: string,
  scope: string,
) => {
  const stravaAuth = { scope, ...(await getStravaAuthResponse(code)) };

  console.log("Strava: Auth response: ", stravaAuth);
  // TODO: save response in the Database (decide how to store it as well, read docs)

  return stravaAuth;
};

const getStravaAuthResponse = async (code: string) => {
  const url = new URL("https://www.strava.com/oauth/token");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", appConfig.stravaClientId);
  // TODO: should this client secret be protected?
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

export const getStravaRoutes = async (athleteId: number) => {
  const url = new URL(
    `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
  );

  return await getDataFromStravaApi<StravaRoute[]>(athleteId, url.toString());
};

const getDataFromStravaApi = async <T>(
  athleteId: number,
  url: string,
): Promise<T> => {
  const accessToken = getStravaAccessToken(athleteId);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (await response.json()) as T;
};

const getStravaAccessToken = async (athleteId: number) => {
  // TODO: check if we already have access token for such user in the database

  // TODO: if token is not in db at all... we are not authorised at all, we should not end up here.
  //  We should let user know we need to re-auth and send to appropriate screen.

  // TODO: if the token is there but is old, should be refreshed, saved in the DB and served
  const nowTimestamp = new Date().getTime();

  // if (auth.expires_at < nowTimestamp) {
  //   return auth.access_token;
  // }

  // const refreshToken = getNewAccessToken(auth.refresh_token);
};

const getNewAccessToken = async (refreshToken: string) => {};

import { appConfig } from "@/constants/config";
import { StravaAuthResponse, StravaRoute } from "@/auth/strava/types";
import { FirebaseDatabaseTypes } from "@react-native-firebase/database";

export const handleStravaAuthorisation =
  (db: FirebaseDatabaseTypes.Module) => async (code: string, scope: string) => {
    const { athlete, ...authStuff } = {
      scope,
      ...(await getStravaAuthResponse(code)),
    };

    console.log("Strava: Auth response saving ", authStuff, athlete);

    const athleteId = athlete.id;

    const userRef = db.ref(`/users/${athleteId}`);
    const stravaAuthRef = db.ref(`/stravaAuth/${athleteId}`);

    await Promise.all([userRef.set(athlete), stravaAuthRef.set(authStuff)]);

    return athleteId;
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

export const saveStravaRoutesInDb =
  (db: FirebaseDatabaseTypes.Module) => async (athleteId: number) => {
    const url = new URL(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
    );

    const stravaRoutes = await getDataFromStravaApi(db)<StravaRoute[]>(
      athleteId,
      url.toString(),
    );

    console.log("Strava: Routes saving ", stravaRoutes);

    const routesRef = db.ref(`/routes/${athleteId}`);
    await routesRef.set(stravaRoutes);

    return stravaRoutes;
  };

const getDataFromStravaApi =
  (db: FirebaseDatabaseTypes.Module) =>
  async <T>(athleteId: number, url: string): Promise<T> => {
    const accessToken = getStravaAccessToken(db)(athleteId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return (await response.json()) as T;
  };

const getStravaAccessToken =
  (db: FirebaseDatabaseTypes.Module) => async (athleteId: number) => {
    const stravaAuthRef = db.ref(`/stravaAuth/${athleteId}`);

    const accessTokenData = (
      await stravaAuthRef.once("value")
    ).val() as StravaAuthResponse;

    console.log(accessTokenData);

    // TODO: if token is not in db at all... we are not authorised at all, we should not end up here.
    //  We should let user know we need to re-auth and send to appropriate screen?

    const { expires_at, access_token, refresh_token } = accessTokenData;

    const nowTimestamp = new Date().getTime();
    if (expires_at < nowTimestamp) {
      return access_token;
    }

    // TODO: implement toke refreshing, saved new token in the db and return new access token
    const refreshToken = getNewAccessToken(refresh_token);
  };

const getNewAccessToken = async (refreshToken: string) => {};

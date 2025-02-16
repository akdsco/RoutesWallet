import {
  StravaAuthResponse,
  StravaAuthResponseRaw,
  StravaDisconnectResponse,
  StravaRouteDetailed,
} from "@/integrations/strava";
import { SQLiteDatabase } from "expo-sqlite";
import { saveInLocalSecureStorage, SECURE } from "@/db/secureStore";
import { log } from "@/library/logger";
import {
  deleteStravaAuthResponseFromDb,
  getStravaAuthFromDb,
  insertDefaultTagOrderInDb,
  insertStravaAthleteInDb,
  insertStravaAuthResponseInDb,
  insertStravaRoutesInDb,
} from "@/db/methods";
import { AppConfig } from "@/library/config";

export const stravaApiDiscovery = {
  authorizationEndpoint: "https://www.strava.com/oauth/mobile/authorize",
  tokenEndpoint: "https://www.strava.com/oauth/token",
  revocationEndpoint: "https://www.strava.com/oauth/deauthorize",
};

export const handleStravaAuthorisation =
  (db: SQLiteDatabase) => async (code: string, scope: string) => {
    const { athlete, ...authData } = {
      scope,
      ...(await getStravaAuthResponse(code)),
    };

    log.debug(
      "handleStravaAuthorisation",
      "Saving user, auth response and default tag order data",
      {
        authData,
        athlete,
      },
    );

    await saveInLocalSecureStorage(SECURE.USER_ID, athlete.id.toString());

    const athletePromise = insertStravaAthleteInDb(db)(athlete);
    const authPromise = insertStravaAuthResponseInDb(db)(athlete.id, authData);
    //  We're inserting tag order at this point (once the user is logged in)
    //  because we need the athlete_id to insert the default tag order
    const orderPromise = insertDefaultTagOrderInDb(db)(athlete.id);

    await Promise.all([athletePromise, authPromise, orderPromise]);

    return athlete.id;
  };

const getStravaAuthResponse = async (
  code: string,
): Promise<StravaAuthResponse> => {
  const url = new URL(stravaApiDiscovery.tokenEndpoint);

  url.searchParams.set("code", code);
  url.searchParams.set("client_id", AppConfig.STRAVA_CLIENT_ID);
  url.searchParams.set("client_secret", AppConfig.STRAVA_CLIENT_SECRET);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetchFromStravaApi<
    StravaAuthResponse | { errors: object[]; message: string }
  >(url.toString());

  // TODO: improve this bullshit TS solution
  if ("errors" in response) {
    throw new Error(`Strava API Error: ${response.message}`);
  }

  return response;
};

export const fetchAllStravaRoutes =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<StravaRouteDetailed[]> => {
    const fnName = "fetchAllStravaRoutes";
    let page = 1;
    const perPage = 200; // API max

    let allRoutes: StravaRouteDetailed[] = [];

    while (true) {
      const url = new URL(
        `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
      );
      url.searchParams.append("page", page.toString());
      url.searchParams.append("per_page", perPage.toString());

      const stravaRoutes = await getDataFromStravaApi(db)<
        StravaRouteDetailed[]
      >(athleteId, url.toString());

      log.debug(fnName, `Fetched ${stravaRoutes.length} routes from Strava`, {
        page,
        perPage,
        routesReceived: stravaRoutes.length,
      });

      if (stravaRoutes.length === 0) {
        break; // No more routes to fetch
      }

      allRoutes = allRoutes.concat(stravaRoutes);
      page++;
    }

    log.debug(fnName, `Fetched ${allRoutes.length} routes from Strava`, {
      athleteId,
    });

    return allRoutes;
  };

export const initStravaRoutes =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const fnName = "initStravaRoutes";
    const stravaRoutes = await fetchAllStravaRoutes(db)(athleteId);

    if (stravaRoutes.length > 0) {
      log.debug(fnName, `Saving ${stravaRoutes.length} routes in Db`, {
        athleteId,
      });
      await insertStravaRoutesInDb(db)(athleteId, stravaRoutes);
    } else {
      log.debug(fnName, "No routes found in Strava account", {
        athleteId,
      });
    }
  };

const getDataFromStravaApi =
  (db: SQLiteDatabase) =>
  async <T>(athleteId: number, url: string): Promise<T> => {
    const accessToken: string = await getStravaAccessToken(db)(athleteId);

    return await fetchFromStravaApi<T>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };

const getStravaAccessToken =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const fnName = "getStravaAccessToken";
    const authData = await getStravaAuthFromDb(db)(athleteId);

    if (!authData) {
      const msg = "No Strava auth data found in the database";
      log.error(fnName, msg, { athleteId, authData });
      throw new Error(msg);
    }

    const { expires_at, access_token, refresh_token } = authData;

    if (!isTokenExpired(expires_at)) {
      log.debug(fnName, "Token is fresh:", { access_token });
      return access_token;
    }

    return await getNewAccessToken(db)(athleteId, refresh_token);
  };

const isTokenExpired = (expiresAt: number) => {
  // Get the current time in seconds since the epoch
  const currentTime = Math.floor(Date.now() / 1000);

  log.debug("isTokenExpired", "Time expiry comparison", {
    currentTime,
    expiresAt,
  });

  // Check if the token is expired or about to expire;
  const bufferTime = 300; // Five-minute buffer in seconds
  return currentTime >= expiresAt - bufferTime;
};

const getNewAccessToken =
  (db: SQLiteDatabase) => async (athleteId: number, refreshToken: string) => {
    log.debug("getNewAccessToken", "Refreshing Strava access token", {
      refreshToken,
      athleteId,
    });

    const url = new URL(stravaApiDiscovery.tokenEndpoint);

    url.searchParams.set("grant_type", "refresh_token");
    url.searchParams.set("client_id", AppConfig.STRAVA_CLIENT_ID);
    url.searchParams.set("client_secret", AppConfig.STRAVA_CLIENT_SECRET);
    url.searchParams.set("refresh_token", refreshToken);

    const stravaAuthResponse = await fetchFromStravaApi<StravaAuthResponseRaw>(
      url.toString(),
    );

    await insertStravaAuthResponseInDb(db)(athleteId, stravaAuthResponse);

    return stravaAuthResponse.access_token;
  };

const fetchFromStravaApi = async <T>(
  url: string,
  requestInit?: RequestInit,
) => {
  const init = requestInit ? requestInit : { method: "POST" };
  const fnName = "fetchFromStravaApi";

  log.debug(fnName, "Fetch request", { url, init });

  const response = await fetch(url, init);
  const responseJson = (await response.json()) as T;

  log.debug(fnName, "Fetch response", { responseJson });

  return responseJson;
};

export const checkStravaConnection =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const auth = await getStravaAuthFromDb(db)(athleteId);

    // If no record is found, the user is not connected
    // TODO: could improve by checking token expiry, if expired, fetching some data from Strava to verify?
    //  this could lead to fast check during 6 hour expiry and slightly slower check after 6 hours, but only once
    return Boolean(auth);
  };

export const disconnectStrava =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const accessToken = await getStravaAccessToken(db)(athleteId);

    const url = new URL(stravaApiDiscovery.revocationEndpoint);
    url.searchParams.set("access_token", accessToken);

    const disconnectResponse =
      await fetchFromStravaApi<StravaDisconnectResponse>(url.toString());

    const fnName = "disconnectStrava";

    if (disconnectResponse) {
      await deleteStravaAuthResponseFromDb(db)(athleteId);
      log.debug(fnName, "User disconnected", { athleteId });
    } else {
      log.debug(fnName, "User disconnect failed", {
        disconnectResponse,
        athleteId,
      });
    }
  };

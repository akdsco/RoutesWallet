import {
  StravaAuthResponse,
  StravaAuthResponseRaw,
  StravaDisconnectResponse,
  StravaRoute,
  StravaRouteFlat,
} from "@/auth/strava/types";
import { SQLiteDatabase } from "expo-sqlite";
import { saveInLocalSecureStorage, SECURE } from "@/db/secureStore";
import { log } from "@/library/logger";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import {
  deleteStravaAuthResponseFromDb,
  getStravaAuthResponseFromDb,
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

export const getStravaRoutesFromDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number, filters?: RouteFilters): Promise<StravaRoute[]> => {
    let query = `
      SELECT 
        sr.id AS id,
        sr.name AS name,
        sr.description AS description,
        sr.distance AS distance,
        sr.elevation_gain AS elevation_gain,
        sr.private AS private,
        sr.starred AS starred,
        sr.sub_type AS sub_type,
        sr.created_at AS created_at,
        sr.updated_at AS updated_at,
        sr.timestamp AS timestamp,
        sr.type AS type,
        sr.estimated_moving_time AS estimated_moving_time,
        sr.waypoints AS waypoints,
        
        -- Athlete details
        sa.id AS athlete_id,
        sa.username AS athlete_username,
        sa.firstname AS athlete_firstname,
        sa.lastname AS athlete_lastname,
        sa.bio AS athlete_bio,
        sa.city AS athlete_city,
        sa.state AS athlete_state,
        sa.country AS athlete_country,
        sa.sex AS athlete_sex,
        sa.premium AS athlete_premium,
        sa.summit AS athlete_summit,
        sa.created_at AS athlete_created_at,
        sa.updated_at AS athlete_updated_at,
        sa.badge_type_id AS athlete_badge_type,
        sa.profile_medium AS athlete_profile_medium,
        sa.profile AS athlete_profile,
        sa.weight AS athlete_weight,
    
        -- Map details
        sm.id AS map_id,
        sm.summary_polyline AS map_summary_polyline,
        sm.resource_state AS map_resource_state,
    
        -- Map URL details
        smu.url AS map_urls_url,
        smu.retina_url AS map_urls_retina_url,
        smu.light_url AS map_urls_light_url,
        smu.dark_url AS map_urls_dark_url
      FROM 
          StravaRoute sr
      JOIN 
          StravaAthlete sa ON sr.athlete_id = sa.id
      JOIN 
          StravaMap sm ON sr.map_id = sm.id
      JOIN 
          StravaMapUrls smu ON sr.map_urls_id = smu.url
      WHERE 
          sr.athlete_id = ?
      `;

    const params: any[] = [athleteId];

    if (filters) {
      const { routeIds } = filters;

      // Filter by route IDs
      if (routeIds && routeIds.length > 0) {
        const placeholders = routeIds.map(() => "?").join(", ");
        query += ` AND sr.id IN (${placeholders})`;

        params.push(...routeIds.map((id) => id.toString()));
      }
    }

    try {
      const flatRoutes = await db.getAllAsync<StravaRouteFlat>(query, params);

      log.debug("getStravaRoutesFromDb", "Routes found in db", {
        routeCount: flatRoutes.length,
      });

      if (flatRoutes.length === 0) {
        return [];
      }

      return mapToStravaRoutes(flatRoutes);
    } catch (error) {
      log.error("getStravaRoutesFromDb", "Route composition error", {
        error,
        query,
        params,
        athleteId,
      });
      throw error;
    }
  };

const mapToStravaRoutes = (flatRoutes: StravaRouteFlat[]): StravaRoute[] => {
  return flatRoutes.map((flatRoute) => {
    return {
      athlete: {
        id: flatRoute.athlete_id,
        username: flatRoute.athlete_username,
        resource_state: flatRoute.athlete_resource_state,
        firstname: flatRoute.athlete_firstname,
        lastname: flatRoute.athlete_lastname,
        bio: flatRoute.athlete_bio,
        city: flatRoute.athlete_city,
        state: flatRoute.athlete_state,
        country: flatRoute.athlete_country,
        created_at: flatRoute.athlete_created_at,
        updated_at: flatRoute.athlete_updated_at,
        badge_type_id: flatRoute.athlete_badge_type_id,
        premium: flatRoute.athlete_premium,
        summit: flatRoute.athlete_summit,
        profile_medium: flatRoute.athlete_profile_medium,
        profile: flatRoute.athlete_profile,
        sex: flatRoute.athlete_sex,
        follower: flatRoute.athlete_follower,
        friend: flatRoute.athlete_friend,
        weight: flatRoute.athlete_weight,
      },
      id: flatRoute.id,
      id_str: flatRoute.id_str,
      name: flatRoute.name,
      starred: flatRoute.starred,
      created_at: flatRoute.created_at,
      updated_at: flatRoute.updated_at,
      description: flatRoute.description,
      distance: flatRoute.distance,
      elevation_gain: flatRoute.elevation_gain,
      private: flatRoute.private,
      resource_state: flatRoute.resource_state,
      estimated_moving_time: flatRoute.estimated_moving_time,
      sub_type: flatRoute.sub_type,
      timestamp: flatRoute.timestamp,
      type: flatRoute.type,
      waypoints: flatRoute.waypoints,
      map_urls: {
        url: flatRoute.map_urls_url,
        retina_url: flatRoute.map_urls_retina_url,
        light_url: flatRoute.map_urls_light_url,
        dark_url: flatRoute.map_urls_dark_url,
      },
      map: {
        id: flatRoute.map_id,
        summary_polyline: flatRoute.map_summary_polyline,
        resource_state: flatRoute.map_resource_state,
      },
    };
  });
};

export const getStravaRoutes =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const url = new URL(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
    );

    const stravaRoutes = await getDataFromStravaApi(db)<StravaRoute[]>(
      athleteId,
      url.toString(),
    );

    if (stravaRoutes.length > 0) {
      log.debug("saveStravaRoutesInDb", "Routes exist, saving in db", {
        athleteId,
      });
      await insertStravaRoutesInDb(db)(athleteId, stravaRoutes);
    }

    return stravaRoutes;
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
    const { expires_at, access_token, refresh_token } =
      await getStravaAuthResponseFromDb(db)(athleteId);

    if (!isTokenExpired(expires_at)) {
      log.debug("getStravaAccessToken", "Token is fresh:", { access_token });
      return access_token;
    }

    return await getNewAccessToken(db)(refresh_token, athleteId);
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
  (db: SQLiteDatabase) => async (refreshToken: string, athleteId: number) => {
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
    const authResponse = await getStravaAuthResponseFromDb(db)(athleteId);

    // If no record is found, the user is not connected
    // TODO: could improve by checking token expiry, if expired, fetching some data from Strava to verify?
    //  this could lead to fast check during 6 hour expiry and slightly slower check after 6 hours, but only once
    return Boolean(authResponse);
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

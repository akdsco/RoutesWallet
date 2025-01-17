import { appConfig } from "@/constants/config";
import {
  StravaAuthResponse,
  StravaRoute,
  StravaRouteFlat,
} from "@/auth/strava/types";
import { SQLiteDatabase } from "expo-sqlite";
import { saveUserData, SECURE } from "@/db/secureStore";

export const handleStravaAuthorisation =
  (db: SQLiteDatabase) => async (code: string, scope: string) => {
    const { athlete, ...authData } = {
      scope,
      ...(await getStravaAuthResponse(code)),
    };

    console.log("Strava: Auth response saving ", authData, athlete);

    await saveUserData(SECURE.USER_ID, athlete.id.toString());

    try {
      const insertStravaAthleteSQL = `
      INSERT INTO StravaAthlete (
        id, username, resource_state, firstname, lastname, bio, city, state, country, sex, premium, summit, created_at, updated_at, badge_type_id, profile_medium, profile, friend, follower, weight
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username=excluded.username,
        resource_state=excluded.resource_state,
        firstname=excluded.firstname,
        lastname=excluded.lastname,
        bio=excluded.bio,
        city=excluded.city,
        state=excluded.state,
        country=excluded.country,
        sex=excluded.sex,
        premium=excluded.premium,
        summit=excluded.summit,
        created_at=excluded.created_at,
        updated_at=excluded.updated_at,
        badge_type_id=excluded.badge_type_id,
        profile_medium=excluded.profile_medium,
        profile=excluded.profile,
        friend=excluded.friend,
        follower=excluded.follower,
        weight=excluded.weight;
    `;

      await db.runAsync(insertStravaAthleteSQL, [
        athlete.id,
        athlete.username,
        athlete.resource_state,
        athlete.firstname,
        athlete.lastname,
        athlete.bio,
        athlete.city,
        athlete.state,
        athlete.country,
        athlete.sex,
        athlete.premium,
        athlete.summit,
        athlete.created_at,
        athlete.updated_at,
        athlete.badge_type_id,
        athlete.profile_medium,
        athlete.profile,
        athlete.friend,
        athlete.follower,
        athlete.weight ?? null,
      ]);

      const insertStravaAuthDataSQL = `
      INSERT INTO StravaAuthResponse (
        scope, token_type, expires_at, expires_in, refresh_token, access_token, athlete_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(athlete_id) DO UPDATE SET
        scope=excluded.scope,
        token_type=excluded.token_type,
        expires_at=excluded.expires_at,
        expires_in=excluded.expires_in,
        refresh_token=excluded.refresh_token,
        access_token=excluded.access_token;
    `;

      await db.runAsync(insertStravaAuthDataSQL, [
        authData.scope,
        authData.token_type,
        authData.expires_at,
        authData.expires_in,
        authData.refresh_token,
        authData.access_token,
        athlete.id,
      ]);
    } catch (error) {
      console.log("Error saving", error);
    }

    return athlete.id;
  };

const getStravaAuthResponse = async (code: string) => {
  const url = new URL("https://www.strava.com/oauth/token");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", appConfig.stravaClientId);
  url.searchParams.set("client_secret", appConfig.stravaClientSecret);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url.toString(), {
    method: "POST",
  });

  return (await response.json()) as StravaAuthResponse;
};

export const getStravaRoutesFromDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    try {
      const query = `
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
          StravaMapUrls smu ON sr.map_urls_id = smu.url;
    `;

      const flatRoutes = await db.getAllAsync<StravaRouteFlat>(query, [
        athleteId,
      ]);

      return mapToStravaRoutes(flatRoutes);
    } catch (e) {
      console.error(e);
      return [];
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

export const saveStravaRoutesInDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const url = new URL(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes`,
    );

    const stravaRoutes = await getDataFromStravaApi(db)<StravaRoute[]>(
      athleteId,
      url.toString(),
    );

    if (stravaRoutes.length > 0) {
      console.log("Strava: Routes exist, saving in db");
      await insertStravaRoutes(db)(athleteId, stravaRoutes);
    }

    return stravaRoutes;
  };

const getDataFromStravaApi =
  (db: SQLiteDatabase) =>
  async <T>(athleteId: number, url: string): Promise<T> => {
    const accessToken: string = await getStravaAccessToken(db)(athleteId);

    const data = fetchFromStravaApi<T>(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log("Data from Strava", data);

    return data;
  };

const getStravaAccessToken =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const query = `
      SELECT *
      FROM StravaAuthResponse
      WHERE athlete_id = ?;
    `;

    const accessTokenData = await db.getFirstAsync<StravaAuthResponse>(query, [
      athleteId,
    ]);

    console.log("accessTokenData", accessTokenData);

    if (!accessTokenData) {
      throw new Error("No auth data found for the given athlete ID");
    }
    const { expires_at, access_token, refresh_token } = accessTokenData;

    if (!access_token) {
      console.log("Should re-auth here?");
      throw new Error("No access token found for the given athlete ID");
    }

    const nowTimestamp = new Date().getTime();

    console.debug("expires_at", expires_at);
    console.debug("nowTimestamp", nowTimestamp);

    if (expires_at < nowTimestamp) {
      console.log("Token fresh", access_token);
      return access_token;
    }

    return await getNewAccessToken(db)(refresh_token, athleteId);
  };

const getNewAccessToken =
  (db: SQLiteDatabase) => async (refreshToken: string, athleteId: number) => {
    const url = new URL("https://www.strava.com/oauth/token");

    url.searchParams.set("grant_type", "refresh_token");
    url.searchParams.set("client_id", appConfig.stravaClientId);
    url.searchParams.set("client_secret", appConfig.stravaClientSecret);
    url.searchParams.set("refresh_token", refreshToken);

    const stravaAuthResponse = await fetchFromStravaApi<StravaAuthResponse>(
      url.toString(),
    );

    const insertStravaAuthDataSQL = `
      INSERT INTO StravaAuthResponse (
        token_type, expires_at, expires_in, refresh_token, access_token, athlete_id
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(athlete_id) DO UPDATE SET
        token_type=excluded.token_type,
        expires_at=excluded.expires_at,
        expires_in=excluded.expires_in,
        refresh_token=excluded.refresh_token,
        access_token=excluded.access_token;
    `;

    await db.runAsync(insertStravaAuthDataSQL, [
      stravaAuthResponse.token_type,
      stravaAuthResponse.expires_at,
      stravaAuthResponse.expires_in,
      stravaAuthResponse.refresh_token,
      stravaAuthResponse.access_token,
      athleteId,
    ]);

    return stravaAuthResponse.access_token;
  };

const insertStravaRoutes =
  (db: SQLiteDatabase) => async (athleteId: number, routes: StravaRoute[]) => {
    const insertStravaRoutesSQL = `
        INSERT INTO StravaRoute (
          athlete_id, description, distance, elevation_gain, id, id_str, map_id, map_urls_id, name, private, resource_state, starred, sub_type, created_at, updated_at, timestamp, type, estimated_moving_time, waypoints
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    const insertStravaMapSQL = `
    INSERT INTO StravaMap (
      id, summary_polyline, resource_state
    ) VALUES (?, ?, ?);
  `;

    const insertIntoStravaMapUrlsSQL = `
    INSERT INTO StravaMapUrls (
      url, retina_url, light_url, dark_url
    ) VALUES (?, ?, ?, ?);
  `;

    await db.execAsync("BEGIN TRANSACTION");

    try {
      for (const route of routes) {
        const routePromise = db.runAsync(insertStravaRoutesSQL, [
          athleteId,
          route.description,
          route.distance,
          route.elevation_gain,
          route.id,
          route.id_str,
          route.map.id,
          route.map_urls.url,
          route.name,
          route.private,
          route.resource_state,
          route.starred,
          route.sub_type,
          route.created_at,
          route.updated_at,
          route.timestamp,
          route.type,
          route.estimated_moving_time,
          JSON.stringify(route.waypoints),
        ]);

        const mapPromise = db.runAsync(insertStravaMapSQL, [
          route.map.id,
          route.map.summary_polyline,
          route.map.resource_state,
        ]);

        const mapUrlsPromise = db.runAsync(insertIntoStravaMapUrlsSQL, [
          route.map_urls.url,
          route.map_urls.retina_url,
          route.map_urls.light_url,
          route.map_urls.dark_url,
        ]);

        await Promise.all([routePromise, mapPromise, mapUrlsPromise]);
      }
      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  };

const fetchFromStravaApi = async <T>(
  url: string,
  requestInit?: RequestInit,
) => {
  console.debug("Strava: Fetching from Strava API", url);
  console.debug("Strava: Request init", requestInit);

  const response = await fetch(
    url,
    requestInit ? requestInit : { method: "POST" },
  );
  const responseJson = (await response.json()) as T;

  console.debug("Strava: Response from Strava API", responseJson);

  return responseJson;
};

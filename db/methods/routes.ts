import { SQLiteDatabase } from "expo-sqlite";
import {
  StravaRouteBase,
  StravaRouteBaseFlat,
  StravaRouteDetailed,
  StravaRouteDetailedFlat,
} from "@/integrations/strava";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import { log, logDb } from "@/library/logger";
import { tables } from "@/db/tables";

export const insertStravaRoutesInDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number, routes: StravaRouteDetailed[]) => {
    const insertStravaRoutesSQL = `
        INSERT OR REPLACE INTO ${tables.stravaRoute} (
          athlete_id, description, distance, elevation_gain, id, id_str, map_id, map_urls_id, name, private, resource_state, starred, sub_type, created_at, updated_at, timestamp, type, estimated_moving_time, waypoints
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    const queryStravaMap = `INSERT OR REPLACE INTO ${tables.stravaMap} (id, summary_polyline, resource_state) VALUES (?, ?, ?);`;
    const queryStravaMapUrls = `INSERT OR REPLACE INTO ${tables.stravaMapUrls} (url, retina_url, light_url, dark_url) VALUES (?, ?, ?, ?);`;

    await db.execAsync("BEGIN TRANSACTION");

    try {
      for (const route of routes) {
        const routePromise = db.runAsync(insertStravaRoutesSQL, [
          athleteId,
          route.description,
          route.distance,
          route.elevation_gain,
          route.id.toString(),
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
          route.timestamp.toString(),
          route.type,
          route.estimated_moving_time.toString(),
          JSON.stringify(route.waypoints),
        ]);

        const mapPromise = db.runAsync(queryStravaMap, [
          route.map.id,
          route.map.summary_polyline,
          route.map.resource_state,
        ]);

        const mapUrlsPromise = db.runAsync(queryStravaMapUrls, [
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

export const getStravaRoutesDetailedFromDb =
  (db: SQLiteDatabase) =>
  async (
    athleteId: number,
    filters?: RouteFilters,
  ): Promise<StravaRouteDetailed[]> => {
    const fnName = "getStravaRoutesDetailedFromDb";
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
          ${tables.stravaRoute} sr
      JOIN 
          ${tables.stravaAthlete} sa ON sr.athlete_id = sa.id
      JOIN 
          ${tables.stravaMap} sm ON sr.map_id = sm.id
      JOIN 
          ${tables.stravaMapUrls} smu ON sr.map_urls_id = smu.url
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
      const flatDetailedRoutes = await db.getAllAsync<StravaRouteDetailedFlat>(
        query,
        params,
      );

      log.debug(fnName, "Routes found in db", {
        routeCount: flatDetailedRoutes.length,
      });

      if (flatDetailedRoutes.length === 0) {
        return [];
      }

      return flatDetailedRoutes.map(toDetailedStravaRoutes);
    } catch (error) {
      log.error(fnName, "Route composition error", {
        error,
        query,
        params,
        athleteId,
      });
      throw error;
    }
  };

const toDetailedStravaRoutes = (
  routeData: StravaRouteDetailedFlat,
): StravaRouteDetailed => {
  return {
    athlete: {
      id: routeData.athlete_id,
      username: routeData.athlete_username,
      resource_state: routeData.athlete_resource_state,
      firstname: routeData.athlete_firstname,
      lastname: routeData.athlete_lastname,
      bio: routeData.athlete_bio,
      city: routeData.athlete_city,
      state: routeData.athlete_state,
      country: routeData.athlete_country,
      created_at: routeData.athlete_created_at,
      updated_at: routeData.athlete_updated_at,
      badge_type_id: routeData.athlete_badge_type_id,
      premium: routeData.athlete_premium,
      summit: routeData.athlete_summit,
      profile_medium: routeData.athlete_profile_medium,
      profile: routeData.athlete_profile,
      sex: routeData.athlete_sex,
      follower: routeData.athlete_follower,
      friend: routeData.athlete_friend,
      weight: routeData.athlete_weight,
    },
    id: routeData.id,
    id_str: routeData.id_str,
    name: routeData.name,
    starred: routeData.starred,
    created_at: routeData.created_at,
    updated_at: routeData.updated_at,
    description: routeData.description,
    distance: routeData.distance,
    elevation_gain: routeData.elevation_gain,
    private: routeData.private,
    resource_state: routeData.resource_state,
    estimated_moving_time: routeData.estimated_moving_time,
    sub_type: routeData.sub_type,
    timestamp: routeData.timestamp,
    type: routeData.type,
    waypoints: routeData.waypoints,
    map_urls: {
      url: routeData.map_urls_url,
      retina_url: routeData.map_urls_retina_url,
      light_url: routeData.map_urls_light_url,
      dark_url: routeData.map_urls_dark_url,
    },
    map: {
      id: routeData.map_id,
      summary_polyline: routeData.map_summary_polyline,
      resource_state: routeData.map_resource_state,
    },
  };
};

export const getStravaRoutesBaseFromDb =
  (db: SQLiteDatabase) =>
  async (
    athleteId: number,
    filters?: RouteFilters,
  ): Promise<StravaRouteBase[]> => {
    let query = `
      SELECT 
        sr.athlete_id AS athlete_id,
        sa.username AS athlete_username,
        sr.description AS description,
        sr.distance AS distance,
        sr.elevation_gain AS elevation_gain,
        sr.id AS id,
        sr.id_str AS id_str,
        smu.url AS map_urls_url,
        smu.retina_url AS map_urls_retina_url,
        smu.light_url AS map_urls_light_url,
        smu.dark_url AS map_urls_dark_url,
        sr.name AS name,
        sr.starred AS starred,
        sr.created_at AS created_at,
        sr.timestamp AS timestamp,
        sr.type AS type
      FROM 
        ${tables.stravaRoute} sr
      JOIN 
        ${tables.stravaAthlete} sa ON sr.athlete_id = sa.id
      JOIN 
        ${tables.stravaMapUrls} smu ON sr.map_urls_id = smu.url
      WHERE 
        sr.athlete_id = ?
    `;
    const params: any[] = [athleteId];

    if (filters?.routeIds && filters.routeIds.length > 0) {
      const placeholders = filters.routeIds.map(() => "?").join(", ");
      query += ` AND sr.id IN (${placeholders})`;
      params.push(...filters.routeIds.map((x) => x.toString()));
    }

    try {
      const flatBaseRoutes = await db.getAllAsync<StravaRouteBaseFlat>(
        query,
        params,
      );

      const routes = flatBaseRoutes.map(toBaseStravaRoutes);
      logDb.debug(tables.stravaRoute, query, {
        athleteId,
        params,
        filters,
        flatBaseRoutes,
        routes,
      });

      return routes;
    } catch (error) {
      logDb.error(tables.stravaRoute, query, { athleteId });
      throw error;
    }
  };

const toBaseStravaRoutes = (
  routeData: StravaRouteBaseFlat,
): StravaRouteBase => {
  return {
    id: routeData.id,
    id_str: routeData.id_str,
    name: routeData.name,
    description: routeData.description,
    distance: routeData.distance,
    elevation_gain: routeData.elevation_gain,
    starred: routeData.starred,
    created_at: routeData.created_at,
    timestamp: routeData.timestamp,
    resource_state: routeData.resource_state,
    type: routeData.type,
    athlete: {
      id: routeData.athlete_id,
      username: routeData.athlete_username,
    },
    map_urls: {
      url: routeData.map_urls_url,
      retina_url: routeData.map_urls_retina_url,
      light_url: routeData.map_urls_light_url,
      dark_url: routeData.map_urls_dark_url,
    },
  };
};

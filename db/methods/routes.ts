import { SQLiteDatabase } from "expo-sqlite";
import {
  StravaRouteBase,
  StravaRouteBaseFlat,
  StravaRouteDetailed,
  StravaRouteDetailedFlat,
  StravaRouteFilterStats,
  StravaRouteFilterStatsFlat,
} from "@/integrations/strava";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import { log, logDb } from "@/library/logger";
import { tables } from "@/db/tables";
import { NumberRange } from "@/library/types";
import {
  metersToKilometers,
  secondsToMinutes,
} from "@/library/conversionFunctions";
import { assignTagToRoute, getTagIdByName, insertTag } from "@/db/methods/tags";
import { isError } from "@/db/error";

export const insertStravaRoutesInDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number, routes: StravaRouteDetailed[]) => {
    const insertStravaRoutesSQL = `
        INSERT OR REPLACE INTO ${tables.stravaRoute} (
          athlete_id, description, distance, elevation_gain, id, map_id, map_urls_id, name, private, resource_state, starred, sub_type, created_at, updated_at, timestamp, type, estimated_moving_time, waypoints
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    const queryStravaMap = `INSERT OR REPLACE INTO ${tables.stravaMap} (id, summary_polyline, resource_state) VALUES (?, ?, ?);`;
    const queryStravaMapUrls = `INSERT OR REPLACE INTO ${tables.stravaMapUrls} (url, retina_url, light_url, dark_url) VALUES (?, ?, ?, ?);`;

    await db.execAsync("BEGIN TRANSACTION");

    try {
      for (const route of routes) {
        const routeData = [
          athleteId,
          route.description,
          route.distance,
          route.elevation_gain,
          route.id,
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
        ];
        const routePromise = db.runAsync(insertStravaRoutesSQL, routeData);

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
        sr.estimated_moving_time AS estimated_moving_time,
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
      params.push(...filters.routeIds);
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
      // TODO: error like this should be better logged, figure out way to extract error message/stack etc and reuse it in each log?
      if (isError(error)) {
        logDb.error(tables.stravaRoute, error, query, { athleteId });
      }

      throw error;
    }
  };

const toBaseStravaRoutes = (
  routeData: StravaRouteBaseFlat,
): StravaRouteBase => {
  return {
    id: routeData.id,
    name: routeData.name,
    description: routeData.description,
    distance: routeData.distance,
    elevation_gain: routeData.elevation_gain,
    estimated_moving_time: routeData.estimated_moving_time,
    starred: routeData.starred,
    created_at: routeData.created_at,
    timestamp: routeData.timestamp,
    resource_state: routeData.resource_state,
    type: routeData.type,
    private: routeData.private,
    athlete: {
      id: routeData.athlete_id,
      username: routeData.athlete_username,
      // TODO: save each route's athlete details in the db and pull them from db (in the joint query above)
      firstname: "to-be-saved-in-db-and-pushed",
      lastname: "to-be-saved-in-db-and-pushed",
      profile_medium: "to-be-saved-in-db-and-pushed",
    },
    map_urls: {
      url: routeData.map_urls_url,
      retina_url: routeData.map_urls_retina_url,
      light_url: routeData.map_urls_light_url,
      dark_url: routeData.map_urls_dark_url,
    },
  };
};

export const getStravaRouteIdsFromDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const query = `SELECT id FROM ${tables.stravaRoute} WHERE athlete_id = ?`;

    try {
      const result = await db.getAllAsync<{ id: string }>(query, [athleteId]);
      logDb.debug(tables.stravaRoute, query, { result, athleteId });

      return result.map(({ id }) => id);
    } catch (error) {
      if (isError(error)) {
        logDb.error(tables.stravaRoute, error, query, { error, athleteId });
      }
      throw error;
    }
  };

export const removeStravaRoutesFromDb =
  (db: SQLiteDatabase) => async (athleteId: number, routeIds: string[]) => {
    if (routeIds.length === 0) {
      log.debug("removeStravaRoutesFromDb", "No routes to remove", {
        athleteId,
        routeIds,
      });
      return;
    }

    const placeholders = routeIds.map(() => "?").join(", ");

    const query = `DELETE FROM ${tables.stravaRoute} WHERE athlete_id = ? AND id IN (${placeholders})`;

    try {
      await db.runAsync(query, [athleteId, ...routeIds]);
      logDb.debug(tables.stravaRoute, query, { athleteId, routeIds });
    } catch (error) {
      if (isError(error)) {
        logDb.error(tables.stravaRoute, error, query, {
          error,
          athleteId,
          routeIds,
          placeholders,
        });
      }
      throw error;
    }
  };

export const fromDetailedToBaseRoute = (
  route: StravaRouteDetailed,
): StravaRouteBase => {
  return {
    athlete: {
      id: route.athlete.id,
      username: route.athlete.username,
      // TODO: save each route's athlete details in the db and pull them from db (in the joint query above)
      firstname: "to-be-saved-in-db-and-pushed",
      lastname: "to-be-saved-in-db-and-pushed",
      profile_medium: "to-be-saved-in-db-and-pushed",
    },
    id: route.id,
    name: route.name,
    starred: route.starred,
    created_at: route.created_at,
    description: route.description,
    distance: route.distance,
    elevation_gain: route.elevation_gain,
    resource_state: route.resource_state,
    estimated_moving_time: route.estimated_moving_time,
    timestamp: route.timestamp,
    type: route.type,
    private: route.private,
    map_urls: route.map_urls,
  };
};

export const getStravaRoutesStatsFromDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const query = `
      SELECT 
        MIN(distance) AS shortest_distance,
        MAX(distance) AS longest_distance,
        MIN(elevation_gain) AS least_elevation_gain,
        MAX(elevation_gain) AS most_elevation_gain,
        MIN(estimated_moving_time) AS shortest_estimated_moving_time,
        MAX(estimated_moving_time) AS longest_estimated_moving_time
      FROM 
        ${tables.stravaRoute}
      WHERE 
        athlete_id = ?
    `;

    try {
      const result = await db.getFirstAsync<StravaRouteFilterStatsFlat>(query, [
        athleteId,
      ]);
      if (!result) {
        throw new Error("No stats found for athlete");
      }
      logDb.debug(tables.stravaRoute, query, { result, athleteId });

      return transformToStravaRouteFilterStats(result);
    } catch (error) {
      if (isError(error)) {
        logDb.error(tables.stravaRoute, error, query, { error, athleteId });
      }
      throw error;
    }
  };

const extendRange = (min: number, max: number, margin: number): NumberRange => {
  const lowEnd = Math.floor(min) - margin < 0 ? 0 : Math.floor(min) - margin;
  return [lowEnd, Math.ceil(max) + margin];
};

const transformToStravaRouteFilterStats = (
  flatStats: StravaRouteFilterStatsFlat,
): StravaRouteFilterStats => {
  const DISTANCE_MARGIN = 5;
  const ELEVATION_GAIN_MARGIN = 10;
  const ESTIMATED_MOVING_TIME_MARGIN = 5;

  return {
    distance: extendRange(
      metersToKilometers(flatStats.shortest_distance),
      metersToKilometers(flatStats.longest_distance),
      DISTANCE_MARGIN,
    ),
    elevationGain: extendRange(
      flatStats.least_elevation_gain,
      flatStats.most_elevation_gain,
      ELEVATION_GAIN_MARGIN,
    ),
    estimatedMovingTime: extendRange(
      secondsToMinutes(flatStats.shortest_estimated_moving_time),
      secondsToMinutes(flatStats.longest_estimated_moving_time),
      ESTIMATED_MOVING_TIME_MARGIN,
    ),
  };
};

export const autoTagRoutes =
  (db: SQLiteDatabase) => async (routes: StravaRouteBase[]) => {
    const autoTags = [
      {
        tagName: "Zone 2",
        keywords: [
          "zone 2",
          "z2",
          "Z2",
          "Zone 2",
          "Zone2",
          "endurance",
          "easy",
          "recovery",
        ],
      },
      {
        tagName: "Hub Velo CC",
        tagColor: "#f9cc33",
        keywords: ["HVCC", "hvcc", "hv cc"],
      },
      {
        tagName: "Monkey",
        keywords: ["monkey"],
      },
    ];

    for (const route of routes) {
      for (const { tagName, tagColor, keywords } of autoTags) {
        // Check if the route matches any of the keywords.
        if (
          keywords.some(
            (keyword) =>
              route.name.includes(keyword) ||
              route.description?.includes(keyword),
          )
        ) {
          let tagId = await getTagIdByName(db)(tagName);
          if (!tagId) {
            const insertResult = await insertTag(db)(tagName, tagColor);
            if (insertResult.success) {
              tagId = insertResult.data.tagId;
            } else {
              // Retry fetching the tag if insertion fails due to race conditions.
              tagId = await getTagIdByName(db)(tagName);
              if (!tagId) {
                log.warn("autoTagRoutes", "Failed to ensure tag exists", {
                  tagName,
                });
                continue;
              }
            }
          }
          // Assign the tag to the route.
          await assignTagToRoute(db)(tagId, route.id);
        }
      }
    }
  };

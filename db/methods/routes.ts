import { SQLiteDatabase } from "expo-sqlite";
import { StravaRoute } from "@/auth/strava";

export const insertStravaRoutesInDb =
  (db: SQLiteDatabase) => async (athleteId: number, routes: StravaRoute[]) => {
    const insertStravaRoutesSQL = `
        INSERT OR REPLACE INTO StravaRoute (
          athlete_id, description, distance, elevation_gain, id, id_str, map_id, map_urls_id, name, private, resource_state, starred, sub_type, created_at, updated_at, timestamp, type, estimated_moving_time, waypoints
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;

    const insertStravaMapSQL = `
    INSERT OR REPLACE INTO StravaMap (
      id, summary_polyline, resource_state
    ) VALUES (?, ?, ?);
  `;

    const insertIntoStravaMapUrlsSQL = `
    INSERT OR REPLACE INTO StravaMapUrls (
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

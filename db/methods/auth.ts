import { StravaAuthResponseRaw } from "@/auth/strava/types";
import { SQLiteDatabase } from "expo-sqlite";
import { logDb } from "@/library/logger";
import { tables } from "@/db/tables";

export const insertStravaAuthResponse =
  (db: SQLiteDatabase) =>
  async (athleteId: number, auth: StravaAuthResponseRaw) => {
    const query = `
      INSERT INTO ${tables.stravaAuthResponse} (
        scope, token_type, expires_at, expires_in, refresh_token, access_token, athlete_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(athlete_id) DO UPDATE SET
        scope = CASE 
                    WHEN excluded.scope IS NOT NULL THEN excluded.scope 
                    ELSE StravaAuthResponse.scope 
                END,
        token_type=excluded.token_type,
        expires_at=excluded.expires_at,
        expires_in=excluded.expires_in,
        refresh_token=excluded.refresh_token,
        access_token=excluded.access_token;
    `;

    logDb.debug(tables.stravaAuthResponse, query, {
      athleteId,
      auth,
    });

    const insertData = [
      auth.scope ? auth.scope : null,
      auth.token_type,
      auth.expires_at,
      auth.expires_in,
      auth.refresh_token,
      auth.access_token,
      athleteId,
    ];

    try {
      await db.runAsync(query, insertData);
    } catch (error) {
      logDb.error(
        tables.stravaAuthResponse,
        "Error when INSERTING strava auth response",
        {
          error,
          athleteId,
          query,
          insertData,
        },
      );
      throw error;
    }
  };

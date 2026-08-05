import {
  StravaAuthResponse,
  StravaAuthResponseRaw,
} from "@/integrations/strava";
import { SQLiteDatabase } from "expo-sqlite";
import { tables } from "@/db/tables";
import { runDbWithLogging } from "@/db/error";

export const insertStravaAuthResponseInDb =
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

    const data = [
      auth.scope ? auth.scope : null,
      auth.token_type,
      auth.expires_at,
      auth.expires_in,
      auth.refresh_token,
      auth.access_token,
      athleteId,
    ];

    await runDbWithLogging(() => db.runAsync(query, data), {
      table: tables.stravaAuthResponse,
      query,
      fnName: "insertStravaAuthResponseInDb",
      data,
    });
  };

export const getStravaAuthFromDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<StravaAuthResponse | null> => {
    const { stravaAuthResponse } = tables;
    const query = `SELECT * FROM ${stravaAuthResponse} WHERE athlete_id = ?;`;
    const data = [athleteId];

    return await runDbWithLogging(
      () => db.getFirstAsync<StravaAuthResponse>(query, data),
      {
        table: stravaAuthResponse,
        query,
        fnName: "getStravaAuthFromDb",
        data,
      },
    );
  };

export const deleteStravaAuthResponseFromDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const { stravaAuthResponse } = tables;
    const query = `DELETE FROM ${stravaAuthResponse} WHERE athlete_id = ?;`;
    const data = [athleteId];

    await runDbWithLogging(() => db.runAsync(query, data), {
      table: stravaAuthResponse,
      query,
      fnName: "deleteStravaAuthResponseFromDb",
      data,
    });
  };

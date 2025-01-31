import { StravaAuthResponseWithoutAthlete } from "@/auth/strava/types";
import { SQLiteDatabase } from "expo-sqlite";
import { log } from "@/library/logger";

export const insertStravaAuthResponse =
  (db: SQLiteDatabase) =>
  async (
    athleteId: number,
    {
      access_token,
      refresh_token,
      token_type,
      expires_in,
      expires_at,
    }: StravaAuthResponseWithoutAthlete,
  ) => {
    const query = `
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

    const insertData = [
      token_type,
      expires_at,
      expires_in,
      refresh_token,
      access_token,
      athleteId,
    ];

    try {
      await db.runAsync(query, insertData);
    } catch (error) {
      log.error(
        "insertStravaAuthResponse",
        "Error when saving strava auth insertData",
        {
          error,
          query,
          insertData,
        },
      );
      throw error;
    }
  };

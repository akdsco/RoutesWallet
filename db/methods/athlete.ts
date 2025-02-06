import { SQLiteDatabase } from "expo-sqlite";
import { StravaAthlete } from "@/auth/strava/types";
import { logDb } from "@/library/logger";
import { tables } from "@/db/tables";

export const insertStravaAthleteToDb =
  (db: SQLiteDatabase) => async (athlete: StravaAthlete) => {
    const fnName = "insertStravaAthleteInDb";

    const query = `
      INSERT INTO ${tables.stravaAthlete} (
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
    logDb.info(tables.stravaAthlete, "INSERT", query, { athlete, fnName });

    try {
      await db.runAsync(query, [
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
    } catch (error) {
      logDb.error(tables.stravaAthlete, "INSERT", query, {
        error,
        athlete,
        fnName,
      });
      throw error;
    }
  };

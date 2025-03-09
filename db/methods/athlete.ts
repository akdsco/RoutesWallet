import { SQLiteDatabase } from "expo-sqlite";
import { StravaAthlete, StravaAthleteBasic } from "@/integrations/strava";
import { tables } from "@/db/tables";
import { runDbWithLogging } from "@/db/error";

export const insertStravaAthleteInDb =
  (db: SQLiteDatabase) => async (athlete: StravaAthlete) => {
    const { stravaAthlete } = tables;
    const query = `
      INSERT INTO ${stravaAthlete} (
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

    const data = [
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
    ];

    await runDbWithLogging(() => db.runAsync(query, data), {
      table: stravaAthlete,
      fnName: "insertStravaAthleteInDb",
      query,
      data,
    });
  };

export const getStravaAthleteBasicProfile =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<StravaAthleteBasic> => {
    const { stravaAthlete } = tables;
    const query = `SELECT id, username, firstname, lastname, profile_medium FROM ${stravaAthlete} WHERE id = ?`;
    const data = [athleteId];

    return await runDbWithLogging(
      () => db.getFirstAsync<StravaAthleteBasic>(query, data),
      {
        table: stravaAthlete,
        fnName: "getStravaAthleteProfileData",
        query,
        data,
      },
    );
  };

import { SQLiteDatabase } from "expo-sqlite";
import { insertTag, updateAthleteTagOrderToTop } from "@/db/methods/tags";

// Barrelled exports for encapsulation purposes
export { insertStravaAuthResponse } from "./auth";

export const handleRouteTagInsert =
  (db: SQLiteDatabase) => async (athleteId: number, tagName: string) => {
    await insertTag(db)(tagName);
    await updateAthleteTagOrderToTop(db)(athleteId, tagName);
  };

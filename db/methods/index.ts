import { SQLiteDatabase } from "expo-sqlite";
import { insertTag, updateAthleteTagOrderToTop } from "@/db/methods/tags";

export const handleRouteTagInsert =
  (db: SQLiteDatabase) => async (athleteId: number, tagName: string) => {
    await insertTag(db)(tagName);
    await updateAthleteTagOrderToTop(db)(athleteId, tagName);
  };

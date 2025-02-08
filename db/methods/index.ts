import { SQLiteDatabase } from "expo-sqlite";
import { insertTag, updateAthleteTagOrderToTop } from "@/db/methods/tags";
import { DbOperationResult } from "@/library/types";

// Barrelled exports for encapsulation purposes
export {
  insertStravaAuthResponseInDb,
  deleteStravaAuthResponseFromDb,
  getStravaAuthFromDb,
} from "./auth";
export { insertStravaAthleteInDb } from "./athlete";
export { insertDefaultTagOrderInDb } from "./tags";
export {
  insertStravaRoutesInDb,
  getStravaRoutesDetailedFromDb,
} from "./routes";

export const handleRouteTagInsert =
  (db: SQLiteDatabase) =>
  async (athleteId: number, tagName: string): DbOperationResult => {
    const insertResult = await insertTag(db)(tagName);
    if (insertResult) {
      return insertResult;
    }
    await updateAthleteTagOrderToTop(db)(athleteId, tagName);
  };

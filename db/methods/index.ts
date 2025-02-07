import { SQLiteDatabase } from "expo-sqlite";
import { insertTag, updateAthleteTagOrderToTop } from "@/db/methods/tags";

// Barrelled exports for encapsulation purposes
export {
  insertStravaAuthResponseInDb,
  deleteStravaAuthResponseFromDb,
  getStravaAuthResponseFromDb,
} from "./auth";
export { insertStravaAthleteInDb } from "./athlete";
export { insertDefaultTagOrderInDb } from "./tags";
export {
  insertStravaRoutesInDb,
  getStravaRoutesDetailedFromDb,
} from "./routes";

export const handleRouteTagInsert =
  (db: SQLiteDatabase) => async (athleteId: number, tagName: string) => {
    await insertTag(db)(tagName);
    await updateAthleteTagOrderToTop(db)(athleteId, tagName);
  };

import { StravaRoute } from "@/auth/strava/types";
import { useEffect, useState } from "react";
import { getStravaRoutesFromDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { getUserData, SECURE } from "@/db/secureStore";
import { useApp } from "@/hooks";

export const useRoutes = () => {
  const db = useSQLiteContext();
  const { isStravaAuthed } = useApp();
  const [routes, setRoutes] = useState<StravaRoute[]>([]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      const routes = await getStravaRoutesFromDb(db)(athleteId);

      setRoutes(routes);
    };

    if (isStravaAuthed) {
      run().then();
    }
  }, [isStravaAuthed]);

  return {
    routes,
  };
};

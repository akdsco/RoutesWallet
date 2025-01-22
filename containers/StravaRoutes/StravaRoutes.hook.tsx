import { StravaRoute } from "@/auth/strava/types";
import { useEffect, useState } from "react";
import { getStravaRoutesFromDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { getUserData, SECURE } from "@/db/secureStore";

export const useRoutes = () => {
  const db = useSQLiteContext();
  const [routes, setRoutes] = useState<StravaRoute[]>([]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      const routes = await getStravaRoutesFromDb(db)(athleteId);

      setRoutes(routes);
    };

    run().then();
  }, []);

  return {
    routes,
  };
};

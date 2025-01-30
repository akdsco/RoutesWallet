import { StravaRoute } from "@/auth/strava/types";
import { useEffect, useState } from "react";
import { getStravaRoutesFromDb } from "@/auth/strava";
import { useSQLiteContext } from "expo-sqlite";
import { getUserData, SECURE } from "@/db/secureStore";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";

export const useRoutes = (filter: RouteFilters) => {
  const db = useSQLiteContext();
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routes, setRoutes] = useState<StravaRoute[]>([]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getUserData<number>(SECURE.USER_ID);
      const routes = await getStravaRoutesFromDb(db)(athleteId, filter);

      setRoutes(routes);
    };

    run().then(() => setLoadingRoutes(false));
  }, []);

  return {
    loadingRoutes,
    routes,
  };
};

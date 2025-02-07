import { StravaRouteBase } from "@/auth/strava/types";
import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getFromLocalSecureStorage, SECURE } from "@/db/secureStore";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import { getStravaRoutesBaseFromDb } from "@/db/methods/routes";

export const useRoutes = (filter: RouteFilters) => {
  const db = useSQLiteContext();
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routes, setRoutes] = useState<StravaRouteBase[]>([]);

  useEffect(() => {
    const run = async () => {
      const athleteId = await getFromLocalSecureStorage<number>(SECURE.USER_ID);
      const routes = await getStravaRoutesBaseFromDb(db)(athleteId, filter);

      setRoutes(routes);
    };

    run().then(() => setLoadingRoutes(false));
  }, []);

  return {
    loadingRoutes,
    routes,
  };
};

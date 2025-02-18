import {
  getStravaRoutesAndSaveInDb,
  StravaRouteBase,
} from "@/integrations/strava";
import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getFromLocalSecureStorage, SECURE } from "@/db/secureStore";
import { RouteFilters } from "@/containers/StravaRoutes/StravaRoutes";
import { getStravaRoutesBaseFromDb } from "@/db/methods";
import { useApp } from "@/hooks";
import { Toast } from "@/library/Toast";
import { log } from "@/library/logger";

export const useRoutes = (filter: RouteFilters) => {
  const db = useSQLiteContext();
  const { athleteId } = useApp();
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routes, setRoutes] = useState<StravaRouteBase[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    log.info("useRoutes:onRefresh", "Refreshing Strava routes");
    const result = await getStravaRoutesAndSaveInDb(db)(athleteId);

    log.info("useRoutes:onRefresh", "Strava routes refreshed", { result });

    const { newRoutesSaved } = result;
    if (newRoutesSaved > 0) {
      Toast(
        "success",
        "Routes synchronised",
        `Found ${newRoutesSaved} new route${newRoutesSaved === 1 ? "" : "s"}`,
      );
    } else {
      Toast("info", "Routes synchronised", "No new routes found");
    }
    setRefreshing(false);
  };

  useEffect(() => {
    const run = async () => {
      const athleteId = await getFromLocalSecureStorage<number>(SECURE.USER_ID);
      const routes = await getStravaRoutesBaseFromDb(db)(athleteId, filter);

      setRoutes(routes);
    };

    run().then(() => setLoadingRoutes(false));
  }, []);

  return {
    refreshing,
    onRefresh,
    loadingRoutes,
    routes,
  };
};

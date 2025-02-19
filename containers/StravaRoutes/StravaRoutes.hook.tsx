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

    if (!result.success) {
      log.error("useRoutes:onRefresh", "Error when refreshing Strava routes", {
        athleteId,
        result,
      });
      Toast("error", "Synchronising routes failed", result.error);
      setRefreshing(false);
      return;
    }

    log.info("useRoutes:onRefresh", "Strava routes refreshed", { result });

    const { totalRoutes, routes } = result.data;

    Toast(
      "success",
      "Routes synchronised",
      `${totalRoutes} route${totalRoutes === 1 ? "" : "s"} available for tagging`,
    );

    setRoutes(routes);
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

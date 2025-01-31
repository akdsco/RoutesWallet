import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/core";
import { log } from "@/library/logger";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { getStravaRoutesFromDb, StravaRoute } from "@/auth/strava";
import { useApp } from "@/hooks";

export const useRouteItemDetails = () => {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<StravaRoute>();
  const { params } = useRoute();
  const { athleteId } = useApp();

  const getRouteById = (db: SQLiteDatabase) => async (routeId: bigint) => {
    if (!athleteId) {
      return [];
    }
    const routeIds = [routeId];
    log.debug("useRouteItemDetails", "Fetching route by ID", {
      athleteId,
      routeIds,
    });

    return getStravaRoutesFromDb(db)(athleteId, { routeIds });
  };

  const addTag = async (routeId: BigInt) => {
    const tagId = 1;

    log.debug("useRouteItemDetails", "Adding route to tag", { tagId, routeId });

    const sql = `
      INSERT INTO RouteTagAssignments (route_id, tag_id)
      VALUES (?, ?);
    `;

    try {
      await db.runAsync(sql, [routeId.toString(), tagId]);
      log.debug("useRouteItemDetails", "Route added to tag", {
        tagId,
        routeId,
      });
    } catch (error) {
      log.error("useRouteItemDetails", "Error when adding route to tag", {
        error,
        tagId,
        routeId,
      });
      throw error;
    }
  };

  useEffect(() => {
    const fetchRoute = async () => {
      if (!params) {
        return;
      }

      log.debug("useRouteItemDetails", "Fetching route", { params });
      // @ts-ignore
      const routeId: bigint = params.route as bigint;

      const routes = await getRouteById(db)(routeId);
      log.debug("useRouteItemDetails", "Fetched route", {
        routes: JSON.stringify(routes).slice(0, 250) + "...",
        params,
      });
      const route = routes[0];

      setRoute(route);
    };

    fetchRoute()
      .then(() => setLoading(false))
      .catch((error) => {
        log.error(
          "useRouteItemDetails : useEffect",
          "Error when executing fetchRoute fn",
          { error, params, athleteId, route },
        );
        throw error;
      });
  }, []);

  return {
    route,
    addTag,
    loading,
  };
};

import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/core";
import { log } from "@/library/logger";
import { SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { StravaRouteDetailed } from "@/integrations/strava";
import { useApp } from "@/hooks";
import { RawTag } from "@/library/types";
import { getStravaRoutesDetailedFromDb } from "@/db/methods";

export const useRouteItemDetails = () => {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<StravaRouteDetailed>();
  const [availableTags, setAvailableTags] = useState<RawTag[]>([]);
  const [assignedTags, setAssignedTags] = useState<RawTag[]>([]);
  const { params } = useRoute();
  const { athleteId } = useApp();

  const getRouteById = (db: SQLiteDatabase) => async (routeId: bigint) => {
    const routeIds = [routeId];

    log.debug("useRouteItemDetails", "Fetching route by ID", {
      athleteId,
      routeIds,
    });

    return getStravaRoutesDetailedFromDb(db)(athleteId, { routeIds });
  };

  const getAssignedTags = async (routeId: BigInt) => {
    const query = `SELECT * FROM RouteTagAssignments WHERE route_id = ?;`;

    try {
      const tags = await db.getAllAsync<RawTag>(query, [routeId.toString()]);
      log.debug("useRouteItemDetails", "Fetched tags for route", {
        tags,
        routeId,
      });
      return tags;
    } catch (error) {
      log.error("useRouteItemDetails", "Error when fetching tags for route", {
        error,
        routeId,
      });
      throw error;
    }
  };

  const getListOfAvailableTags = async (assignedTags: RawTag[]) => {
    if (assignedTags.length === 0) {
      // If no tags are assigned, return all available tags
      return await db.getAllAsync<RawTag>(`SELECT * FROM RouteTags;`);
    }

    // Extract assigned tag IDs
    const assignedTagIds = assignedTags.map((tag) => tag.id);

    // Create a parameterized query to exclude assigned tags
    const placeholders = assignedTagIds.map(() => "?").join(", ");
    const query = `SELECT * FROM RouteTags WHERE id NOT IN (${placeholders});`;

    try {
      const availableTags = await db.getAllAsync<RawTag>(query, assignedTagIds);
      log.debug("useRouteItemDetails", "Fetched available tags", {
        availableTags,
      });
      return availableTags;
    } catch (error) {
      log.error("useRouteItemDetails", "Error when fetching available tags", {
        error,
      });
      throw error;
    }
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
    const run = async () => {
      if (!params) {
        return;
      }

      log.debug("useRouteItemDetails", "Fetching route", { params });
      // @ts-ignore
      const routeId: bigint = params.route as bigint;

      const routesPromise = getRouteById(db)(routeId);
      const assignedTagsPromise = getAssignedTags(routeId);

      const [routes, assignedTags] = await Promise.all([
        routesPromise,
        assignedTagsPromise,
      ]);

      const availableTags = await getListOfAvailableTags(assignedTags);

      const route = routes[0];
      setRoute(route);
      setAvailableTags(availableTags);

      log.debug("useRouteItemDetails", "Fetched route", {
        routes: JSON.stringify(routes).slice(0, 250) + "...",
        params,
      });

      setAssignedTags(assignedTags);
    };

    run()
      .then(() => setLoading(false))
      .catch((error) => {
        log.error(
          "useRouteItemDetails : useEffect",
          "Error when executing useEffect run fn",
          { error, params, athleteId, route },
        );
        throw error;
      });
  }, []);

  return {
    route,
    assignedTags,
    availableTags,
    addTag,
    loading,
  };
};

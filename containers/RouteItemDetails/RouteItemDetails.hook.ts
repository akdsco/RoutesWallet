import { useEffect, useState } from "react";
import { useRoute } from "@react-navigation/core";
import { log } from "@/library/logger";
import { useSQLiteContext } from "expo-sqlite";
import { StravaRouteDetailed } from "@/integrations/strava";
import { useApp } from "@/hooks";
import { TagWithAssignment } from "@/library/types";
import {
  assignTagToRoute,
  getAssignedTagsForRoute,
  getStravaRoutesDetailedFromDb,
  removeTagFromRoute,
} from "@/db/methods";

export const useRouteItemDetails = () => {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<StravaRouteDetailed>();
  const [assignedTags, setAssignedTags] = useState<TagWithAssignment[]>([]);
  const { params } = useRoute();
  const { athleteId } = useApp();

  useEffect(() => {
    const run = async () => {
      if (!params) {
        return;
      }

      log.info("useRouteItemDetails", "Fetching route", { params });
      // @ts-ignore
      const routeId: BigInt = params.route as BigInt;

      const routesPromise = await getStravaRoutesDetailedFromDb(db)(athleteId, {
        routeIds: [routeId],
      });
      const assignedTagsPromise = getAssignedTagsForRoute(db)(routeId);

      const [routes, assignedTags] = await Promise.all([
        routesPromise,
        assignedTagsPromise,
      ]);

      const route = routes[0];
      setRoute(route);

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

  const handleTagToggle = async (tagId: number, isAssigned: boolean) => {
    if (!route) {
      log.warn("handleTagToggle", "Route not found", { route });
      return;
    }

    const routeId = route.id;
    const action = isAssigned ? removeTagFromRoute : assignTagToRoute;

    log.info(
      "handleTagToggle",
      `${isAssigned ? "Removing" : "Assigning"} tag`,
      {
        tagId,
        routeName: route?.name,
        routeId,
      },
    );

    await action(db)(tagId, routeId);

    setAssignedTags((prevTags) =>
      prevTags.map((tag) =>
        tag.id === tagId ? { ...tag, isAssigned: !isAssigned } : tag,
      ),
    );
  };

  const handleSheetChanges = (index: number) => {
    log.info(
      "handleSheetChanges",
      `Bottom sheet ${index === 0 ? "closed" : "open"}`,
      { index },
    );
  };

  return {
    route,
    assignedTags,
    handleTagToggle,
    handleSheetChanges,
    loading,
  };
};

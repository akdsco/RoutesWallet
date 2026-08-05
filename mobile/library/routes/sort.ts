import { StravaRouteCommonFilterable } from "@/integrations/strava";
import { SortBy } from "@/containers/StravaRoutes/useRoutesFilters.hook";

export const sortRoutes = <T extends StravaRouteCommonFilterable>(
  routes: T[],
  sortBy: SortBy,
): T[] => {
  return routes.sort((a, b) => {
    switch (sortBy.name) {
      case "distance":
        if (sortBy.type === "asc") {
          return a.distance - b.distance;
        } else {
          return b.distance - a.distance;
        }
      case "elevation":
        if (sortBy.type === "asc") {
          return a.elevation_gain - b.elevation_gain;
        } else {
          return b.elevation_gain - a.elevation_gain;
        }
      case "movingTime":
        if (sortBy.type === "asc") {
          return a.estimated_moving_time - b.estimated_moving_time;
        } else {
          return b.estimated_moving_time - a.estimated_moving_time;
        }
      default:
        throw new Error("Invalid sort key");
    }
  });
};

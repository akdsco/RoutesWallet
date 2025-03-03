import { StravaRouteCommonFilterable } from "@/integrations/strava";

type RouteFilter = {
  minDistance?: number;
  maxDistance?: number;
  minElevationGain?: number;
  maxElevationGain?: number;
  minEstimatedMovingTime?: number;
  maxEstimatedMovingTime?: number;
  startDate?: Date | string;
  endDate?: Date | string;
};

const filterRoutes = <T extends StravaRouteCommonFilterable>(
  routes: T[],
  filters: RouteFilter,
): T[] => {
  return routes.filter((route) => {
    const createdAt = new Date(route.created_at);

    // Filter by distance
    if (
      filters.minDistance !== undefined &&
      route.distance < filters.minDistance
    ) {
      return false;
    }
    if (
      filters.maxDistance !== undefined &&
      route.distance > filters.maxDistance
    ) {
      return false;
    }

    // Filter by elevation_gain
    if (
      filters.minElevationGain !== undefined &&
      route.elevation_gain < filters.minElevationGain
    ) {
      return false;
    }
    if (
      filters.maxElevationGain !== undefined &&
      route.elevation_gain > filters.maxElevationGain
    ) {
      return false;
    }

    // Filter by created_at (date range)
    if (filters.startDate !== undefined) {
      const startDate =
        typeof filters.startDate === "string"
          ? new Date(filters.startDate)
          : filters.startDate;
      if (createdAt < startDate) {
        return false;
      }
    }
    if (filters.endDate !== undefined) {
      const endDate =
        typeof filters.endDate === "string"
          ? new Date(filters.endDate)
          : filters.endDate;
      if (createdAt > endDate) {
        return false;
      }
    }

    // Filter by estimated_moving_time
    if (
      filters.minEstimatedMovingTime !== undefined &&
      route.estimated_moving_time < filters.minEstimatedMovingTime
    ) {
      return false;
    }
    if (
      filters.maxEstimatedMovingTime !== undefined &&
      route.estimated_moving_time > filters.maxEstimatedMovingTime
    ) {
      return false;
    }

    // If all checks pass, include the route in the results
    return true;
  });
};

// Example usage:
const routes: StravaRouteCommonFilterable[] = [
  {
    distance: 160820.67,
    elevation_gain: 2965.83,
    created_at: "2021-04-15T10:58:09Z",
    estimated_moving_time: 22912,
  },
];

const filters: RouteFilter = {
  minDistance: 100000,
  maxDistance: 200000,
  minElevationGain: 2000,
  startDate: "2021-01-01T00:00:00Z",
  maxEstimatedMovingTime: 25000,
};

const filteredRoutes = filterRoutes(routes, filters);
console.log(filteredRoutes);

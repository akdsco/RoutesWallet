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

export const filterRoutes = <T extends StravaRouteCommonFilterable>(
  routes: T[],
  filters: RouteFilter,
): T[] => {
  const filterByDistance = (route: T) =>
    rangeFilter(route.distance, filters.minDistance, filters.maxDistance);

  const filterByElevation = (route: T) =>
    rangeFilter(
      route.elevation_gain,
      filters.minElevationGain,
      filters.maxElevationGain,
    );

  const filterByDate = (route: T) =>
    dateFilter(route.created_at, filters.startDate, filters.endDate);

  const filterByEstimatedMovingTime = (route: T) =>
    rangeFilter(
      route.estimated_moving_time,
      filters.minEstimatedMovingTime,
      filters.maxEstimatedMovingTime,
    );

  const filtersToApply = [
    filterByDistance,
    filterByElevation,
    filterByDate,
    filterByEstimatedMovingTime,
  ];

  return routes.filter((route) =>
    filtersToApply.every((filterFunction) => filterFunction(route)),
  );
};

const rangeFilter = (value: number, min?: number, max?: number): boolean => {
  if (min !== undefined && value < min) {
    return false;
  }

  return !(max !== undefined && value > max);
};

const dateFilter = (
  dateString: string,
  startDate?: Date | string,
  endDate?: Date | string,
): boolean => {
  const date = new Date(dateString);
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && date < start) {
    return false;
  }

  return !(end && date > end);
};

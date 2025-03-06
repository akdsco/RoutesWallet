import {
  StravaRouteBase,
  StravaRouteCommonFilterable,
} from "@/integrations/strava";
import Fuse from "fuse.js";
import { FilterBy } from "@/containers/StravaRoutes/useRoutesFilters.hook";
import { log } from "@/library/logger";

export const filterRoutes = <T extends StravaRouteCommonFilterable>(
  routes: T[],
  fuse: Fuse<StravaRouteBase>,
  filterBy: FilterBy,
  filters: RouteFilterValues,
): T[] => {
  if (
    !filterBy.search &&
    !filterBy.distance &&
    !filterBy.elevation &&
    !filterBy.movingTime
  ) {
    log.debug("filterRoutes", "Filters reset");
    return [];
  }

  const filtersToApply: ((route: T) => boolean)[] = [];

  if (filters.searchTerm) {
    const searchResult = fuse.search(filters.searchTerm);
    const matchingIds = new Set(searchResult.map(({ item }) => item.id));
    filtersToApply.push((route: T) => matchingIds.has(route.id));
  }

  if (filterBy.distance) {
    const filterByDistance = (route: T) =>
      rangeFilter(route.distance, filters.minDistance, filters.maxDistance);
    filtersToApply.push(filterByDistance);
  }

  if (filterBy.elevation) {
    const filterByElevation = (route: T) =>
      rangeFilter(
        route.elevation_gain,
        filters.minElevationGain,
        filters.maxElevationGain,
      );
    filtersToApply.push(filterByElevation);
  }

  // TODO maybe implement date picker as well
  // if(filterBy.createdByDate) {
  //   const filterByDate = (route: T) =>
  //     dateFilter(route.created_at, filters.startDate, filters.endDate);
  // }

  if (filterBy.movingTime) {
    const filterByEstimatedMovingTime = (route: T) =>
      rangeFilter(
        route.estimated_moving_time,
        filters.minEstimatedMovingTime,
        filters.maxEstimatedMovingTime,
      );
    filtersToApply.push(filterByEstimatedMovingTime);
  }

  return routes.filter((route) =>
    filtersToApply.every((filterFunction) => filterFunction(route)),
  );
};

type RouteFilterValues = {
  searchTerm?: string;
  minDistance?: number;
  maxDistance?: number;
  minElevationGain?: number;
  maxElevationGain?: number;
  minEstimatedMovingTime?: number;
  maxEstimatedMovingTime?: number;
  startDate?: Date | string;
  endDate?: Date | string;
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

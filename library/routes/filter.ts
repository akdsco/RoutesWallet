import { StravaRouteCommonFilterable } from "@/integrations/strava";
import Fuse from "fuse.js";
import { FilterBy } from "@/containers/StravaRoutes/useRoutesFilters.hook";
import { log } from "@/library/logger";
import { ConvertNumFn } from "@/library/types";
import {
  metersToKilometers,
  secondsToMinutes,
} from "@/library/conversionFunctions";

export const filterRoutes = <T extends StravaRouteCommonFilterable>(
  routes: T[],
  fuse: Fuse<StravaRouteCommonFilterable>,
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
    const filterBySearchTerm = (route: T) => matchingIds.has(route.id);

    filtersToApply.push(filterBySearchTerm);
  }

  if (filterBy.distance) {
    const filterByDistance = (route: T) =>
      rangeFilter(
        "distance",
        route.distance,
        filters.minDistance,
        filters.maxDistance,
        metersToKilometers,
      );
    filtersToApply.push(filterByDistance);
  }

  if (filterBy.elevation) {
    const filterByElevation = (route: T) =>
      rangeFilter(
        "elevation",
        route.elevation_gain,
        filters.minElevationGain,
        filters.maxElevationGain,
        (val) => Math.round(val),
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
        "movingTime",
        route.estimated_moving_time,
        filters.minEstimatedMovingTime,
        filters.maxEstimatedMovingTime,
        secondsToMinutes,
      );
    filtersToApply.push(filterByEstimatedMovingTime);
  }

  const allFiltered = routes.filter((route) => {
    const filterFunctionResults = filtersToApply.every((filterFunction) => {
      const result = filterFunction(route);
      log.debug("filterRoutes", "Each filter function result", { result });

      return result;
    });
    return filterFunctionResults;
  });

  return allFiltered;
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

const rangeFilter = (
  type: "distance" | "elevation" | "movingTime",
  value: number,
  min?: number,
  max?: number,
  unitConverter: ConvertNumFn = (val) => val,
): boolean => {
  const convertedValue = unitConverter(value);

  const isAboveMin = min !== undefined ? convertedValue >= min : true;
  const isBelowMax = max !== undefined ? convertedValue <= max : true;

  const result = isAboveMin && isBelowMax;

  // TODO: Can we make it log only on request?
  console.debug(
    "rangeFilter",
    type,
    `Value: ${convertedValue}\n`,
    `Min: ${min}`,
    `Max: ${max}`,
    `Result: ${result ? "PASS" : "FAIL"}`,
  );
  return result;
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

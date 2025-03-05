import React, { useEffect, useMemo, useState } from "react";
import { NumberRange } from "@/library/types";
import { useApp } from "@/hooks";
import { useSQLiteContext } from "expo-sqlite";
import { getStravaRoutesStatsFromDb } from "@/db/methods";
import BottomSheet from "@gorhom/bottom-sheet";
import { log } from "@/library/logger";
import Fuse from "fuse.js";
import { StravaRouteBase } from "@/integrations/strava";
import { Keyboard } from "react-native";

type AppliedFilterKeys = "search" | "distance" | "elevation" | "movingTime";
export type AppliedFilters = Record<AppliedFilterKeys, boolean>;

export const useRoutesFilters = (
  bottomSheetRef: React.RefObject<BottomSheet>,
  routes: StravaRouteBase[],
) => {
  const { athleteId } = useApp();
  const db = useSQLiteContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [searchInProgress, setSearchInProgress] = useState(false);

  const extremeValuesInit: Record<string, NumberRange> = {
    distance: [0, 999999],
    elevationGain: [0, 999999],
    estimatedMovingTime: [0, 999999],
  };

  const [extremeValues, setExtremeValues] =
    useState<Record<string, NumberRange>>(extremeValuesInit);

  const [distanceRange, setDistanceRange] = useState<NumberRange>(
    extremeValuesInit.distance,
  );
  const [elevationRange, setElevationRange] = useState<NumberRange>(
    extremeValuesInit.elevationGain,
  );
  const [movingTimeRange, setMovingTimeRange] = useState<NumberRange>(
    extremeValuesInit.estimatedMovingTime,
  );

  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const [filteredRoutes, setFilteredRoutes] = useState<StravaRouteBase[]>([]);

  const isRangeEqual = (current: NumberRange, extreme: NumberRange) => {
    return current[0] !== extreme[0] || current[1] !== extreme[1];
  };

  // TODO: when adding paging, this will need to be updated (so we always pull all routes and search through all)
  const fuse = new Fuse(routes, {
    includeScore: true,
    threshold: 0.4,
    keys: ["name", "description"],
  });

  const applyFilters = (appliedFilters: AppliedFilters) => {
    const { search, distance, elevation, movingTime } = appliedFilters;

    if (!search && !distance && !elevation && !movingTime) {
      setFilteredRoutes([]);
      return;
    }

    let filteredRoutes = routes;

    // String - search
    if (search && searchTerm.trim().length > 0) {
      const result = fuse.search(searchTerm);
      filteredRoutes = result.map(({ item }) => item);

      log.info("useRoutes: executeSearch", "Routes found", {
        searchTerm,
        result,
      });
    }

    // Number - distance
    if (distance && distanceRange) {
      const [minDistance, maxDistance] = distanceRange;
      filteredRoutes = filteredRoutes.filter(
        (route) =>
          route.distance >= minDistance && route.distance <= maxDistance,
      );
    }

    // Number - elevation
    if (elevation && elevationRange) {
      const [minElevation, maxElevation] = elevationRange;
      filteredRoutes = filteredRoutes.filter(
        (route) =>
          route.elevation_gain >= minElevation &&
          route.elevation_gain <= maxElevation,
      );
    }

    // Number - moving time
    if (movingTime && movingTimeRange) {
      const [minMovingTime, maxMovingTime] = movingTimeRange;
      filteredRoutes = filteredRoutes.filter(
        (route) =>
          route.estimated_moving_time >= minMovingTime &&
          route.estimated_moving_time <= maxMovingTime,
      );
    }

    // Finally, update state with the filtered routes
    setFilteredRoutes(filteredRoutes);
  };

  const appliedFilters = useMemo(() => {
    const { distance, elevationGain, estimatedMovingTime } = extremeValues;

    const appliedFilters = {
      search: searchInProgress,
      distance: isRangeEqual(distanceRange, distance),
      elevation: isRangeEqual(elevationRange, elevationGain),
      movingTime: isRangeEqual(movingTimeRange, estimatedMovingTime),
    };

    console.log("appliedFilters", appliedFilters);

    setIsFilterApplied(Object.values(appliedFilters).some(Boolean));
    return appliedFilters;
  }, [
    extremeValues,
    searchInProgress,
    distanceRange,
    elevationRange,
    movingTimeRange,
  ]);

  // TODO: misleading name, not only submit but also clear search - rename?
  const onSearchSubmit = () => {
    Keyboard.dismiss();

    if (appliedFilters.search) {
      setSearchInProgress(false);
      setSearchTerm("");
      return;
    }

    if (searchTerm.trim() === "") {
      return;
    }

    setSearchInProgress(true);
    // Below only removes empty spaces left behind
    setSearchTerm((value) => value.trim());
  };

  useEffect(() => {
    (async () => {
      const { distance, elevationGain, estimatedMovingTime } =
        await getStravaRoutesStatsFromDb(db)(athleteId);
      setDistanceRange(distance);
      setElevationRange(elevationGain);
      setMovingTimeRange(estimatedMovingTime);
      setExtremeValues({ distance, elevationGain, estimatedMovingTime });
    })();
  }, []);

  useEffect(() => {
    log.info("useRoutes:appliedFilters", "Applying filters", {
      appliedFilters,
    });
    applyFilters(appliedFilters);
  }, [appliedFilters]);

  const onBottomSheetOpen = () => {
    if (!bottomSheetRef.current) {
      return;
    }

    log.info("useRoutes: onBottomSheetOpen", "Opening filters bottom sheet");
    bottomSheetRef.current.expand();
  };

  const onBottomSheetClose = () => {
    bottomSheetRef.current?.close();
  };

  const resetAllFilters = () => {
    setFilteredRoutes([]);

    setSearchTerm("");
    setDistanceRange(extremeValues.distance);
    setElevationRange(extremeValues.elevationGain);
    setMovingTimeRange(extremeValues.estimatedMovingTime);
  };

  return {
    noRoutesAvailable: !isFilterApplied && routes.length === 0,
    filteredRoutes: isFilterApplied ? filteredRoutes : routes,
    search: {
      term: searchTerm,
      onChange: (searchText: string) => setSearchTerm(searchText),
      onSubmit: onSearchSubmit,
    },
    distance: {
      range: distanceRange,
      onChange: (value: NumberRange) => setDistanceRange(value),
    },
    elevation: {
      range: elevationRange,
      onChange: (value: NumberRange) => setElevationRange(value),
    },
    movingTime: {
      range: movingTimeRange,
      onChange: (value: NumberRange) => setMovingTimeRange(value),
    },
    extremeValues,
    onBottomSheetOpen,
    onBottomSheetClose,
    isFilterApplied,
    appliedFilters,
    resetAllFilters,
  };
};

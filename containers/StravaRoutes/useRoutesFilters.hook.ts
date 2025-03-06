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
import { filterRoutes } from "@/library/routes/filter";

type FilterKeys = "search" | "distance" | "elevation" | "movingTime";
export type FilterBy = Record<FilterKeys, boolean>;

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

  const applyFilters = (filterBy: FilterBy) => {
    log.info("useRoutes:applyFilters", "Applying filters", {
      filterBy,
      searchTerm,
      distanceRange,
      elevationRange,
      movingTimeRange,
    });

    const filteredRoutes = filterRoutes(routes, fuse, filterBy, {
      searchTerm: filterBy.search ? searchTerm : undefined,
      minDistance: filterBy.distance ? distanceRange[0] : undefined,
      maxDistance: filterBy.distance ? distanceRange[1] : undefined,
      minElevationGain: filterBy.elevation ? elevationRange[0] : undefined,
      maxElevationGain: filterBy.elevation ? elevationRange[1] : undefined,
      minEstimatedMovingTime: filterBy.movingTime
        ? movingTimeRange[0]
        : undefined,
      maxEstimatedMovingTime: filterBy.movingTime
        ? movingTimeRange[1]
        : undefined,
    });

    log.info("useRoutes:applyFilters", "Filtering outcome", {
      showing: filteredRoutes.length,
      from: routes.length,
    });

    setFilteredRoutes(filteredRoutes);
  };

  const appliedFilters = useMemo(() => {
    const { distance, elevationGain, estimatedMovingTime } = extremeValues;

    return {
      search: searchInProgress,
      distance: isRangeEqual(distanceRange, distance),
      elevation: isRangeEqual(elevationRange, elevationGain),
      movingTime: isRangeEqual(movingTimeRange, estimatedMovingTime),
    };
  }, [
    extremeValues,
    searchInProgress,
    distanceRange,
    elevationRange,
    movingTimeRange,
  ]);

  // TODO: misleading name, not only submit but also clear search - rename?
  const onSearchChange = async () => {
    Keyboard.dismiss();

    if (appliedFilters.search) {
      resetAllFilters();
      return;
    }

    if (searchTerm.trim() === "") {
      return;
    }

    setSearchInProgress(true);
    setIsFilterApplied(true);

    // Below only removes empty spaces left behind
    setSearchTerm((value) => value.trim());

    // TODO: hack to bypass react state update that isn't "fast" enough - fix needed
    applyFilters({ ...appliedFilters, search: true });
  };

  const onNumberRangeSubmit = () => {
    setIsFilterApplied(true);
    applyFilters(appliedFilters);
  };

  // Updates state to reflect the min/max values from the database
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
    setIsFilterApplied(false);
    setSearchInProgress(false);
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
      onChange: (searchTerm: string) => setSearchTerm(searchTerm),
      onSubmit: onSearchChange,
    },
    distance: {
      range: distanceRange,
      onChange: (range: NumberRange) => setDistanceRange(range),
    },
    elevation: {
      range: elevationRange,
      onChange: (range: NumberRange) => setElevationRange(range),
    },
    movingTime: {
      range: movingTimeRange,
      onChange: (range: NumberRange) => setMovingTimeRange(range),
    },
    onNumberRangeSubmit,
    extremeValues,
    onBottomSheetOpen,
    onBottomSheetClose,
    isFilterApplied,
    appliedFilters,
    resetAllFilters,
  };
};

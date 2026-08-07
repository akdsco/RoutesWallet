import React, { useEffect, useMemo, useState } from "react";
import {
  FilterKeys,
  FunctionCall,
  NumberRange,
  SortKeys,
} from "@/library/types";
import { useApp } from "@/hooks";
import { useSQLiteContext } from "expo-sqlite";
import { getStravaRoutesStatsFromDb } from "@/db/methods";
import BottomSheet from "@gorhom/bottom-sheet";
import { log } from "@/library/logger";
import Fuse from "fuse.js";
import { StravaRouteBase } from "@/integrations/strava";
import { Keyboard } from "react-native";
import { filterRoutes } from "@/library/routes/filter";
import { sortRoutes } from "@/library/routes/sort";

type Sort = "dsc" | "asc";
export type UpdateSort = (object: SortBy) => void;
export type SortBy = { name: SortKeys; type: Sort };

const sortInit: SortBy = {
  name: "distance",
  type: "dsc",
};

export type FilterBy = Record<FilterKeys, boolean>;

export type FilterProps = {
  filteredRoutes: StravaRouteBase[];
  search: {
    term: string;
    onChange: (searchTerm: string) => void;
    onSubmit: FunctionCall;
    onReset: FunctionCall;
  };
  distance: {
    range: NumberRange;
    onChange: (range: NumberRange) => void;
    onReset: FunctionCall;
  };
  elevation: {
    range: NumberRange;
    onChange: (range: NumberRange) => void;
    onReset: FunctionCall;
  };
  movingTime: {
    range: NumberRange;
    onChange: (range: NumberRange) => void;
    onReset: FunctionCall;
  };
  sortBy: SortBy;
  updateSort: UpdateSort;
  onNumberRangeSubmit: FunctionCall;
  extremeValues: Record<string, NumberRange>;
  isFilterApplied: boolean;
  appliedFilters: FilterBy;
  resetAllFilters: FunctionCall;
};

type UseRoutesFilters = FilterProps & {
  noRoutesAvailable: boolean;
  onBottomSheetOpen: FunctionCall;
  onBottomSheetClose: FunctionCall;
};

export const useRoutesFilters = (
  bottomSheetRef: React.RefObject<BottomSheet>,
  routes: StravaRouteBase[],
): UseRoutesFilters => {
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

  const [sortBy, setSortBy] = useState<SortBy>(sortInit);

  const updateSort: UpdateSort = (object: SortBy) => {
    setSortBy((prev) =>
      prev.name !== object.name ? { name: object.name, type: "dsc" } : object,
    );
  };

  useEffect(() => {
    log.info("useRoutesFilter", "Sort change", { sortBy });
  }, [sortBy]);

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

    const filters = {
      search: searchInProgress,
      distance: isRangeEqual(distanceRange, distance),
      elevation: isRangeEqual(elevationRange, elevationGain),
      movingTime: isRangeEqual(movingTimeRange, estimatedMovingTime),
    };

    if (
      !filters.search &&
      !filters.distance &&
      !filters.elevation &&
      !filters.movingTime
    ) {
      setIsFilterApplied(false);
    }

    return filters;
  }, [
    extremeValues,
    searchInProgress,
    distanceRange,
    elevationRange,
    movingTimeRange,
  ]);

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

    // TODO: hack to bypass react state update that isn't "fast" enough - fix needed?
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

  const checkFiltersAndReApplyAfterPartialReset = (filterKey: FilterKeys) => {
    switch (filterKey) {
      case "search":
        setSearchInProgress(false);
        setSearchTerm("");
        applyFilters({ ...appliedFilters, search: false });
        break;
      case "distance":
        setDistanceRange(extremeValues.distance);
        applyFilters({ ...appliedFilters, distance: false });
        break;
      case "elevation":
        setElevationRange(extremeValues.elevationGain);
        applyFilters({ ...appliedFilters, elevation: false });
        break;
      case "movingTime":
        setMovingTimeRange(extremeValues.estimatedMovingTime);
        applyFilters({ ...appliedFilters, movingTime: false });
        break;
    }
  };

  return {
    noRoutesAvailable: !isFilterApplied && routes.length === 0,
    filteredRoutes: isFilterApplied
      ? sortRoutes(filteredRoutes, sortBy)
      : sortRoutes(routes, sortBy),
    search: {
      term: searchTerm,
      onChange: (searchTerm: string) => setSearchTerm(searchTerm),
      onSubmit: onSearchChange,
      onReset: () => checkFiltersAndReApplyAfterPartialReset("search"),
    },
    distance: {
      range: distanceRange,
      onChange: (range: NumberRange) => setDistanceRange(range),
      onReset: () => checkFiltersAndReApplyAfterPartialReset("distance"),
    },
    elevation: {
      range: elevationRange,
      onChange: (range: NumberRange) => setElevationRange(range),
      onReset: () => checkFiltersAndReApplyAfterPartialReset("elevation"),
    },
    movingTime: {
      range: movingTimeRange,
      onChange: (range: NumberRange) => setMovingTimeRange(range),
      onReset: () => checkFiltersAndReApplyAfterPartialReset("movingTime"),
    },
    sortBy,
    updateSort,
    onNumberRangeSubmit,
    extremeValues,
    onBottomSheetOpen,
    onBottomSheetClose,
    isFilterApplied,
    appliedFilters,
    resetAllFilters,
  };
};

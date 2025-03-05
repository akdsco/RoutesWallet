import React, { useEffect, useMemo, useState } from "react";
import { NumberRange } from "@/library/types";
import { useApp } from "@/hooks";
import { useSQLiteContext } from "expo-sqlite";
import { getStravaRoutesStatsFromDb } from "@/db/methods";
import BottomSheet from "@gorhom/bottom-sheet";

export const useRoutesFilters = (
  bottomSheetRef: React.RefObject<BottomSheet>,
) => {
  const { athleteId } = useApp();
  const db = useSQLiteContext();

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

  const closeBottomSheet = () => {
    bottomSheetRef.current?.close();
  };

  const checkIfFilterApplied = (current: NumberRange, extreme: NumberRange) => {
    return current[0] !== extreme[0] || current[1] !== extreme[1];
  };

  const appliedFilters = useMemo(() => {
    const appliedFilters = {
      distance: checkIfFilterApplied(distanceRange, extremeValues.distance),
      elevation: checkIfFilterApplied(
        elevationRange,
        extremeValues.elevationGain,
      ),
      movingTime: checkIfFilterApplied(
        movingTimeRange,
        extremeValues.estimatedMovingTime,
      ),
    };

    setIsFilterApplied(Object.values(appliedFilters).some(Boolean));
    return appliedFilters;
  }, [distanceRange, elevationRange, movingTimeRange, extremeValues]);

  const resetFilters = () => {
    setDistanceRange(extremeValues.distance);
    setElevationRange(extremeValues.elevationGain);
    setMovingTimeRange(extremeValues.estimatedMovingTime);
  };

  return {
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
    closeBottomSheet,
    appliedFilters,
    isFilterApplied,
    resetFilters,
  };
};

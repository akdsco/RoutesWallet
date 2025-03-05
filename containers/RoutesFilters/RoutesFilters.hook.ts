import { useEffect, useState } from "react";
import { NumberRange } from "@/library/types";
import { RoutesFiltersProps } from "@/containers/RoutesFilters/RoutesFilters";
import { useApp } from "@/hooks";
import { useSQLiteContext } from "expo-sqlite";
import { getStravaRoutesStatsFromDb } from "@/db/methods";

export const useRoutesFilters = ({ bottomSheetRef }: RoutesFiltersProps) => {
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

  return {
    distanceRange,
    onDistanceChange: (value: NumberRange) => setDistanceRange(value),
    elevationRange,
    onElevationChange: (value: NumberRange) => setElevationRange(value),
    movingTimeRange,
    onMovingTimeChange: (value: NumberRange) => setMovingTimeRange(value),
    extremeValues,
    closeBottomSheet,
  };
};

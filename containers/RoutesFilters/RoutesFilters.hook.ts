import { useState } from "react";
import { NumberRange } from "@/library/types";
import { RoutesFiltersProps } from "@/containers/RoutesFilters/RoutesFilters";

export const useRoutesFilters = ({ bottomSheetRef }: RoutesFiltersProps) => {
  // TODO: Implement DB data for inits
  const [distanceRange, setDistanceRange] = useState<NumberRange>([30, 500]);
  const [elevationRange, setElevationRange] = useState<NumberRange>([10, 2500]);
  const [movingTimeRange, setMovingTimeRange] = useState<NumberRange>([
    20, 300,
  ]);

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
    closeBottomSheet,
  };
};

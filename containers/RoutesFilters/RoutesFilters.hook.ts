import { useState } from "react";

type NumberRange = [number, number];

export const useRoutesFilters = () => {
  // TODO: Implement DB data for inits
  const [distanceRange, setDistanceRange] = useState<[number, number]>([
    30, 500,
  ]);
  const [elevationRange, setElevationRange] = useState<[number, number]>([
    10, 2500,
  ]);

  return {
    distanceRange,
    onDistanceChange: (value: NumberRange) => setDistanceRange(value),
    elevationRange,
    onElevationChange: (value: NumberRange) => setElevationRange(value),
  };
};

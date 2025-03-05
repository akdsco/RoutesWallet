import { NumberRange } from "@/library/types";
import { useTheme } from "@/hooks";
import { useEffect, useState } from "react";

export const useRangeSlider = (
  range: NumberRange,
  extremeValues: NumberRange,
) => {
  const { theme } = useTheme();
  const [isRangeApplied, setIsRangeApplied] = useState(false);

  const areRangesEqual = (range: NumberRange, extremeRange: NumberRange) => {
    if (extremeRange[0] === 0 && extremeRange[1] === 999999) {
      return true;
    }
    return range[0] === extremeRange[0] && range[1] === extremeRange[1];
  };

  useEffect(() => {
    setIsRangeApplied(!areRangesEqual(range, extremeValues));
  }, [range]);

  return {
    theme,
    isRangeApplied,
  };
};

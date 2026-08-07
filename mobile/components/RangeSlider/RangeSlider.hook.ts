import { NumberRange, RangeUpdateFn } from "@/library/types";
import { useTheme } from "@/hooks";
import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";

export const useRangeSlider = (
  range: NumberRange,
  onRangeChange: RangeUpdateFn,
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

  const onValueChange = (values: NumberRange) => {
    onRangeChange(values);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
  };

  useEffect(() => {
    setIsRangeApplied(!areRangesEqual(range, extremeValues));
  }, [range]);

  return {
    theme,
    onValueChange,
    isRangeApplied,
  };
};

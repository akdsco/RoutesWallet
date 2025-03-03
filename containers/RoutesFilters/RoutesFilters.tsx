import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";
import { useRoutesFilters } from "@/containers/RoutesFilters/RoutesFilters.hook";
import { RangeWithValues } from "@/components/RangeWithValues/RangeWithValues";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React from "react";

type RoutesFiltersProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
};

export const RoutesFilters = ({ bottomSheetRef }: RoutesFiltersProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const {
    distanceRange,
    onDistanceChange,
    elevationRange,
    onElevationChange,
    movingTimeRange,
    onMovingTimeChange,
  } = useRoutesFilters();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={[1, "85%"]}
      handleStyle={styles.bottomSheetHandleStyle}
      enableContentPanningGesture={false}
      handleIndicatorStyle={styles.bottomSheetHandleIndicatorStyle}
      backgroundStyle={styles.bottomSheetBackgroundStyle}
    >
      <BottomSheetView style={styles.sheetViewContainer}>
        <ThemedText>Filters</ThemedText>
        <RangeWithValues
          range={distanceRange}
          rangeTitle="Distance"
          unitName="km"
          onRangeChange={onDistanceChange}
        />
        <RangeWithValues
          rangeTitle="Elevation"
          unitName="m"
          range={elevationRange}
          onRangeChange={onElevationChange}
        />
        <RangeWithValues
          rangeTitle="Moving Time"
          unitName="min"
          range={movingTimeRange}
          onRangeChange={onMovingTimeChange}
        />
      </BottomSheetView>
    </BottomSheet>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    bottomSheetHandleStyle: {
      backgroundColor: theme.contrastBg,
      borderTopLeftRadius: 5,
      borderTopRightRadius: 5,
    },
    bottomSheetHandleIndicatorStyle: {
      backgroundColor: theme.text,
    },
    bottomSheetBackgroundStyle: {
      backgroundColor: theme.contrastBg,
    },
    sheetViewContainer: {
      flex: 1,
      alignItems: "center",
    },
  });

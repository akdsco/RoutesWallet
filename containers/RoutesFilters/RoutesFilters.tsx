import { StyleSheet, View } from "react-native";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";
import { RangeWithValues } from "@/components/RangeWithValues/RangeWithValues";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React from "react";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button/Buttons";
import { FunctionCall, NumberRange, RangeUpdateFn } from "@/library/types";
import { FilterBy } from "@/containers/StravaRoutes/useRoutesFilters.hook";

type RangeFilter = {
  range: NumberRange;
  onChange: RangeUpdateFn;
  onReset: FunctionCall;
};

export type RoutesFiltersProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  distance: RangeFilter;
  elevation: RangeFilter;
  movingTime: RangeFilter;
  onNumberRangeSubmit: () => void;
  extremeValues: Record<string, NumberRange>;
  onBottomSheetClose: () => void;
  appliedFilters: FilterBy;
  isFilterApplied: boolean;
  resetAllFilters: () => void;
  routeCount: number;
};

export const RoutesFilters = ({
  bottomSheetRef,
  distance,
  elevation,
  movingTime,
  onNumberRangeSubmit,
  extremeValues,
  onBottomSheetClose,
  appliedFilters,
  isFilterApplied,
  resetAllFilters,
  routeCount,
}: RoutesFiltersProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={[1, "65%"]}
      handleStyle={styles.bottomSheetHandleStyle}
      enableContentPanningGesture={false}
      handleIndicatorStyle={styles.bottomSheetHandleIndicatorStyle}
      backgroundStyle={styles.bottomSheetBackgroundStyle}
    >
      <BottomSheetView style={styles.sheetViewContainer}>
        <ThemedText>Filters</ThemedText>
        <View style={styles.generalFilersContainer}>
          <View>
            <RangeWithValues
              range={distance.range}
              rangeTitle="Distance"
              unitLabel="km"
              iconLabel="bicycle"
              onRangeChange={distance.onChange}
              onRangeReset={distance.onReset}
              onRangeSubmit={onNumberRangeSubmit}
              extremeValues={extremeValues.distance}
              isApplied={appliedFilters.distance}
              step={5}
            />
            <RangeWithValues
              rangeTitle="Elevation"
              unitLabel="m"
              iconLabel="trending-up-outline"
              range={elevation.range}
              onRangeReset={elevation.onReset}
              onRangeChange={elevation.onChange}
              onRangeSubmit={onNumberRangeSubmit}
              isApplied={appliedFilters.elevation}
              extremeValues={extremeValues.elevationGain}
            />
            <RangeWithValues
              isTimeRange
              rangeTitle="Moving Time"
              unitLabel="min"
              iconLabel="time-outline"
              range={movingTime.range}
              onRangeReset={movingTime.onReset}
              onRangeChange={movingTime.onChange}
              onRangeSubmit={onNumberRangeSubmit}
              isApplied={appliedFilters.movingTime}
              extremeValues={extremeValues.estimatedMovingTime}
            />
          </View>
          <View style={styles.filterBottomBtnContainer}>
            {/*TODO improve disabled btn style (dark mode only)?*/}
            <Button
              title="Reset all filters"
              disabled={!isFilterApplied}
              onPress={resetAllFilters}
              accessibilityLabel=""
            />
            <Button
              title={`Show ${routeCount} routes`}
              onPress={onBottomSheetClose}
              accessibilityLabel=""
            />
          </View>
        </View>
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
    generalFilersContainer: {
      flex: 1,
      paddingBottom: 16,
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    filterBottomBtnContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
    },
  });

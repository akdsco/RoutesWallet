import { StyleSheet, View } from "react-native";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";
import { RangeWithValues } from "@/components/RangeWithValues/RangeWithValues";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React from "react";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button/Buttons";
import { NumberRange, RangeUpdateFn } from "@/library/types";

export type RoutesFiltersProps = {
  bottomSheetRef: React.RefObject<BottomSheet>;
  distance: { range: NumberRange; onChange: RangeUpdateFn };
  elevation: { range: NumberRange; onChange: RangeUpdateFn };
  movingTime: { range: NumberRange; onChange: RangeUpdateFn };
  extremeValues: Record<string, NumberRange>;
  closeBottomSheet: () => void;
  appliedFilters: Record<string, boolean>;
  isFilterApplied: boolean;
  resetFilters: () => void;
};

export const RoutesFilters = ({
  bottomSheetRef,
  distance,
  elevation,
  movingTime,
  extremeValues,
  closeBottomSheet,
  appliedFilters,
  isFilterApplied,
  resetFilters,
}: RoutesFiltersProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

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
        <View style={styles.generalFilersContainer}>
          <View>
            <RangeWithValues
              range={distance.range}
              rangeTitle="Distance"
              unitLabel="km"
              iconLabel="bicycle"
              onRangeChange={distance.onChange}
              extremeValues={extremeValues.distance}
              step={5}
            />
            <RangeWithValues
              rangeTitle="Elevation"
              unitLabel="m"
              iconLabel="trending-up-outline"
              range={elevation.range}
              onRangeChange={elevation.onChange}
              extremeValues={extremeValues.elevationGain}
            />
            <RangeWithValues
              isTimeRange
              rangeTitle="Moving Time"
              unitLabel="min"
              iconLabel="time-outline"
              range={movingTime.range}
              onRangeChange={movingTime.onChange}
              extremeValues={extremeValues.estimatedMovingTime}
            />
          </View>
          <View style={styles.filterBottomBtnContainer}>
            {/*TODO improve disabled btn style (dark mode only)?*/}
            <Button
              title="Reset filters"
              disabled={!isFilterApplied}
              onPress={resetFilters}
              accessibilityLabel=""
            />
            <Button
              title="Show X routes"
              onPress={closeBottomSheet}
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

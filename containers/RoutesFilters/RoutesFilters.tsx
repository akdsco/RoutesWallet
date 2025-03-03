import { StyleSheet, View } from "react-native";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";
import { useRoutesFilters } from "@/containers/RoutesFilters/RoutesFilters.hook";
import { RangeWithValues } from "@/components/RangeWithValues/RangeWithValues";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import React from "react";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button/Buttons";

export type RoutesFiltersProps = {
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
    closeBottomSheet,
  } = useRoutesFilters({ bottomSheetRef });

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
              range={distanceRange}
              rangeTitle="Distance"
              unitLabel="km"
              iconLabel="bicycle"
              onRangeChange={onDistanceChange}
            />
            <RangeWithValues
              rangeTitle="Elevation"
              unitLabel="m"
              iconLabel="trending-up-outline"
              range={elevationRange}
              onRangeChange={onElevationChange}
            />
            <RangeWithValues
              rangeTitle="Moving Time"
              unitLabel="min"
              iconLabel="time-outline"
              range={movingTimeRange}
              onRangeChange={onMovingTimeChange}
            />
          </View>
          <View>
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
  });

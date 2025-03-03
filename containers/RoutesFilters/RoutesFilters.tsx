import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";
import { useRoutesFilters } from "@/containers/RoutesFilters/RoutesFilters.hook";
import { RangeWithValues } from "@/components/RangeWithValues/RangeWithValues";

export const RoutesFilters = () => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { distanceRange, onDistanceChange, elevationRange, onElevationChange } =
    useRoutesFilters();

  return (
    // <BottomSheetView style={styles.sheetViewContainer}>
    <>
      <ThemedText>Filters</ThemedText>
      <RangeWithValues
        range={distanceRange}
        rangeTitle="Distance"
        unitName="km"
        onValueChange={onDistanceChange}
      />
      <RangeWithValues
        rangeTitle="Elevation"
        unitName="m"
        range={elevationRange}
        onValueChange={onElevationChange}
      />
    </>
    // </BottomSheetView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    sheetViewContainer: {
      flex: 1,
      alignItems: "center",
    },
  });

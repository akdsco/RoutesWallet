import { StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Theme } from "@/library/theme";
import { useTheme } from "@/hooks";

export const RoutesFilters = () => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <BottomSheetView style={styles.sheetViewContainer}>
      <ThemedText>Filters</ThemedText>
    </BottomSheetView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    sheetViewContainer: {
      flex: 1,
      alignItems: "center",
    },
  });

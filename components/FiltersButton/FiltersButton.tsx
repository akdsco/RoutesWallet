import { StyleSheet, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";
import React from "react";
import { useTheme } from "@/hooks";
import { Theme } from "@/library/theme";

export const FiltersButton = () => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={() => console.log("Filters button pressed")}
    >
      <FontAwesome name="filter" size={20} color="#fff" />
      <ThemedText style={styles.floatingButtonText}>Filters</ThemedText>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    floatingButton: {
      position: "absolute",
      bottom: 20,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.contrastBackground,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 25,
      zIndex: 20,
      // If you want a shadow on iOS, you can add:
      // shadowColor: "#000",
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.3,
      // shadowRadius: 4,
      elevation: 4, // Android shadow
    },
    floatingButtonText: {
      marginLeft: 8,
      fontWeight: 600,
    },
  });

import { StyleSheet, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";
import React from "react";
import { useTheme } from "@/hooks";
import { Theme } from "@/library/theme";

type FiltersButtonProps = {
  onPress: () => void;
};

export const FiltersOpenButton = ({ onPress }: FiltersButtonProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <TouchableOpacity style={styles.floatingButton} onPress={onPress}>
      <FontAwesome name="filter" size={20} color={theme.icon} />
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
      backgroundColor: theme.contrastBg,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 25,
      borderWidth: theme.borderWidth,
      borderColor: theme.borderColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4, // Android shadow
    },
    floatingButtonText: {
      marginLeft: 8,
      fontWeight: 600,
    },
  });

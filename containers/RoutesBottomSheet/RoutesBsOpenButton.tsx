import { StyleSheet, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";
import React from "react";
import { useTheme } from "@/hooks";
import { Theme } from "@/library/theme";

type FiltersButtonProps = {
  onPress: () => void;
  isFiltered: boolean;
};

export const RoutesBsOpenButton = ({
  isFiltered,
  onPress,
}: FiltersButtonProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(isFiltered, theme);

  return (
    <TouchableOpacity style={styles.floatingButton} onPress={onPress}>
      <FontAwesome
        name="filter"
        size={20}
        color={isFiltered ? theme.pop : theme.icon}
      />
      <ThemedText style={styles.floatingButtonText}>Filters</ThemedText>
    </TouchableOpacity>
  );
};

const makeStyles = (isFiltered: boolean, theme: Theme) =>
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
      borderWidth: isFiltered ? 1 : theme.borderWidth,
      borderColor: isFiltered ? theme.pop : theme.borderColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4, // Android shadow
    },
    floatingButtonText: {
      marginLeft: 8,
      fontWeight: 600,
      color: isFiltered ? theme.pop : theme.icon,
    },
  });

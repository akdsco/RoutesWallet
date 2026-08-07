import Ionicons from "@expo/vector-icons/Ionicons";
import { Animated, Pressable, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { useTheme } from "@/hooks";
import { FunctionCall, IconLabel, SortKeys } from "@/library/types";
import { UpdateSort } from "@/containers/StravaRoutes/useRoutesFilters.hook";

type SortSelectionButtonProps = {
  name: SortKeys;
  isSelected: boolean;
  sortDescending: boolean;
  updateSort: UpdateSort | FunctionCall;
};

const icons: Record<SortKeys, IconLabel> = {
  distance: "bicycle",
  elevation: "trending-up-outline",
  movingTime: "time-outline",
};

export const SortSelectionButton = ({
  name,
  isSelected,
  sortDescending = true,
  updateSort,
}: SortSelectionButtonProps) => {
  const { theme } = useTheme();
  const rotateAnim = useRef(new Animated.Value(sortDescending ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: sortDescending ? 0 : 1, // 0 = down, 1 = up
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [sortDescending]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"], // Rotate up when at 1
  });

  const translateY = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5], // Adjust this value to keep it visually centered
  });

  const translateX = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0], // If needed, tweak this to fine-tune alignment
  });

  return (
    <Pressable
      onPress={() => updateSort({ name, type: sortDescending ? "asc" : "dsc" })}
      style={{ paddingHorizontal: 8 }}
    >
      <View style={{ flexDirection: "row" }}>
        <Ionicons
          name={icons[name]}
          size={33}
          color={isSelected ? theme.pop : theme.icon}
        />
        {isSelected && (
          <Animated.View
            style={{
              position: "absolute",
              right: -2,
              top: -4,
              transform: [{ rotate }, { translateY }, { translateX }],
            }}
          >
            <Ionicons
              name="arrow-down"
              size={20}
              color={isSelected ? theme.popContrast : theme.text}
              style={{ position: "absolute", right: -10, top: -5 }}
            />
          </Animated.View>
        )}
      </View>
    </Pressable>
  );
};

import { RangeSlider } from "@/components/RangeSlider/RangeSlider";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { FunctionCall, RangeProps } from "@/library/types";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";

type RangeWithLabelsProps = RangeProps & {
  rangeTitle: string;
  unitLabel: string;
  iconLabel: "bicycle" | "trending-up-outline" | "time-outline";
  onRangeReset: FunctionCall;
  isApplied?: boolean;
  isTimeRange?: boolean;
};

export const RangeWithValues = ({
  rangeTitle,
  unitLabel,
  iconLabel,
  isApplied,
  isTimeRange,
  range,
  onRangeReset,
  extremeValues,
  onRangeChange,
  onRangeSubmit,
  step,
}: RangeWithLabelsProps) => {
  const { theme } = useTheme();

  const formatMinutesToHoursAndMinutes = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    if (hours > 0 && minutes % 60 === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}min`;
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onRangeReset();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topLayerContainer}>
        <View style={styles.labelContainer}>
          <Ionicons
            name={iconLabel}
            size={20}
            color={theme.icon}
            style={styles.icon}
          />
          <ThemedText type="defaultSemiBold">{rangeTitle}</ThemedText>
        </View>
        {isApplied && (
          <Pressable onPress={handleReset} style={styles.resetRangeButton}>
            <FontAwesome size={22} name="times" color={theme.pop} />
          </Pressable>
        )}
      </View>
      <RangeSlider
        {...{ range, extremeValues, onRangeChange, onRangeSubmit, step }}
      />
      {isTimeRange ? (
        <View style={styles.valuesAndUnitContainer}>
          <ThemedText>{formatMinutesToHoursAndMinutes(range[0])}</ThemedText>
          <ThemedText>{formatMinutesToHoursAndMinutes(range[1])}</ThemedText>
        </View>
      ) : (
        <View style={styles.valuesAndUnitContainer}>
          <ThemedText>{`${range[0]} ${unitLabel}`}</ThemedText>
          <ThemedText>{`${range[1]} ${unitLabel}`}</ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: 250,
    maxWidth: 500,
    width: 330,
    marginBottom: 16,
  },
  topLayerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  icon: {
    marginRight: 7,
  },
  resetRangeButton: { padding: 10, position: "absolute", right: 0 },
  valuesAndUnitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

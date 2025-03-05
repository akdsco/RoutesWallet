import { RangeSlider } from "@/components/RangeSlider/RangeSlider";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { RangeProps } from "@/library/types";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks";

type RangeWithLabelsProps = RangeProps & {
  rangeTitle: string;
  unitLabel: string;
  iconLabel: "bicycle" | "trending-up-outline" | "time-outline";
};

export const RangeWithValues = ({
  rangeTitle,
  unitLabel,
  iconLabel,
  range,
  extremeValues,
  onRangeChange,
}: RangeWithLabelsProps) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Ionicons
          name={iconLabel}
          size={20}
          color={theme.icon}
          style={styles.icon}
        />
        <ThemedText type="defaultSemiBold">{rangeTitle}</ThemedText>
      </View>
      <RangeSlider {...{ range, extremeValues, onRangeChange }} />
      <View style={styles.valuesAndUnitContainer}>
        <ThemedText>{`${range[0]} ${unitLabel}`}</ThemedText>
        <ThemedText>{`${range[1]} ${unitLabel}`}</ThemedText>
      </View>
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
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  icon: {
    marginRight: 7,
  },
  valuesAndUnitContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

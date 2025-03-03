import { RangeSlider } from "@/components/RangeSlider/RangeSlider";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { RangeProps } from "@/library/types";

type RangeWithValuesProps = RangeProps & {
  rangeTitle: string;
  unitName: string;
};

export const RangeWithValues = ({
  rangeTitle,
  unitName,
  range,
  onRangeChange,
}: RangeWithValuesProps) => {
  return (
    <View style={styles.container}>
      <ThemedText>{rangeTitle}</ThemedText>
      <RangeSlider range={range} onRangeChange={onRangeChange} />
      <View style={styles.valuesAndUnitContainer}>
        <ThemedText>{`${range[0]} ${unitName}`}</ThemedText>
        <ThemedText>{`${range[1]} ${unitName}`}</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 250,
    maxWidth: 500,
    width: 330,
  },
  valuesAndUnitContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

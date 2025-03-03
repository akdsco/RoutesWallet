import { RangeSlider } from "@/components/RangeSlider/RangeSlider";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";

type RangeWithValuesProps = {
  rangeTitle: string;
  unitName: string;
  range: [number, number];
  onValueChange: (value: [number, number]) => void;
};

export const RangeWithValues = ({
  rangeTitle,
  unitName,
  range,
  onValueChange,
}: RangeWithValuesProps) => {
  return (
    <View style={styles.container}>
      <ThemedText>{rangeTitle}</ThemedText>
      <RangeSlider range={range} onValueChange={onValueChange} />
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
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

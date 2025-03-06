import { Chip } from "@rneui/base";
import { useTheme } from "@/hooks";
import { View } from "react-native";
import { IconLabel } from "@/library/types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";

type FilterChipProps = {
  title: string;
  iconLabel: IconLabel;
  onPress: () => void;
};

export const FilterChip = ({ title, iconLabel, onPress }: FilterChipProps) => {
  const { theme } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onPress();
  };

  return (
    <View>
      <Chip
        size="sm"
        type="outline"
        title={title}
        icon={{
          name: iconLabel,
          type: "ionicon",
          size: 18,
          color: theme.pop,
        }}
        iconPosition="left"
        buttonStyle={{
          borderColor: theme.popContrast,
          borderWidth: 1.15,
        }}
        titleStyle={{ color: theme.text, fontSize: 12 }}
        onPress={handlePress}
        containerStyle={{ marginVertical: 3, marginRight: 5 }}
      />
      <FontAwesome
        name="times"
        size={15}
        color={theme.pop}
        style={{ position: "absolute", right: -4, top: -8, padding: 5 }}
        onPress={handlePress}
      />
    </View>
  );
};

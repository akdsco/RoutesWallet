import {
  Button as ReactNativeButton,
  StyleProp,
  TouchableHighlight,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks";

type ButtonProps = {
  title: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Button = ({
  title,
  accessibilityLabel,
  onPress,
  disabled,
  style,
}: ButtonProps) => {
  const { theme } = useTheme();

  return (
    <View style={style}>
      <TouchableHighlight
        style={{
          paddingHorizontal: 12,
          borderRadius: 10,
          borderColor: theme.tint,
          borderStyle: "solid",
          borderWidth: 1,
        }}
      >
        <ReactNativeButton
          disabled={disabled}
          onPress={onPress}
          title={title}
          color={theme.text}
          accessibilityLabel={accessibilityLabel}
        />
      </TouchableHighlight>
    </View>
  );
};

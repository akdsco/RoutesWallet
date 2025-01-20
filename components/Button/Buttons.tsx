import { Button as ReactNativeButton, TouchableHighlight } from "react-native";
import { useTheme } from "@/hooks";

type ButtonProps = {
  title: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export const Button = ({
  title,
  accessibilityLabel,
  onPress,
  disabled,
}: ButtonProps) => {
  const theme = useTheme();

  return (
    <TouchableHighlight
      style={{
        height: 40,
        width: 160,
        borderRadius: 10,
        borderColor: theme.tint,
        borderStyle: "solid",
        borderWidth: 1,
        marginLeft: 50,
        marginRight: 50,
        marginTop: 20,
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
  );
};

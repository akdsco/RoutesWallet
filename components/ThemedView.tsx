import { View, type ViewProps } from "react-native";
import { useTheme } from "@/hooks";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const [theme] = useTheme();
  const backgroundColor = theme.background;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}

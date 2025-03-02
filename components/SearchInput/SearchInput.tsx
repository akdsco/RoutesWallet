import { TextInput, View } from "react-native";
import { useTheme } from "@/hooks";

export const SearchInput = () => {
  const { theme } = useTheme();

  return (
    <View style={{ padding: 5 }}>
      <TextInput
        placeholder="Search..."
        onChangeText={() => console.log("Search")}
        style={{
          borderWidth: theme.borderWidth,
          borderColor: theme.borderColor,
          padding: 8,
        }}
      />
    </View>
  );
};

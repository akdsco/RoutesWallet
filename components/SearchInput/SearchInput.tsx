import { Pressable, TextInput, View } from "react-native";
import { useTheme } from "@/hooks";
import { useState } from "react";
import { ThemedText } from "@/components/ThemedText";

type SearchInputProps = {
  executeSearch: (searchTerm: string) => void;
};

export const SearchInput = ({ executeSearch }: SearchInputProps) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <View style={{ padding: 5 }}>
      <TextInput
        placeholder="Search..."
        value={searchTerm}
        onChangeText={(value) => setSearchTerm(value)}
        style={{
          padding: 8,
          color: theme.text,
          borderWidth: theme.borderWidth,
          borderColor: theme.borderColor,
        }}
      />
      <Pressable onPress={() => executeSearch(searchTerm)}>
        <View
          style={{
            backgroundColor: theme.background,
            padding: 8,
            borderRadius: 5,
            marginTop: 5,
          }}
        >
          <ThemedText>Search</ThemedText>
        </View>
      </Pressable>
    </View>
  );
};

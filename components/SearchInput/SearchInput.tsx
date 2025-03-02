import { Pressable, TextInput, View } from "react-native";
import { useTheme } from "@/hooks";
import { useState } from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";

type SearchInputProps = {
  executeSearch: (searchTerm: string) => void;
  foundRoutes: number;
  onSearchReset: () => void;
  isInSearchMode: boolean;
  setIsInSearchMode: (isInSearchMode: boolean) => void;
};

export const SearchInput = ({
  executeSearch,
  foundRoutes,
  onSearchReset,
  isInSearchMode,
  setIsInSearchMode,
}: SearchInputProps) => {
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");

  const { borderWidth, borderColor } = theme;

  const handleSearch = () => {
    if (isInSearchMode) {
      onSearchReset();
      setSearchTerm("");
      setIsInSearchMode(false);
      return;
    }

    executeSearch(searchTerm);
    setIsInSearchMode(true);
  };

  const handleSearchTermChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
  };

  return (
    <View
      style={{
        margin: 5,
        borderColor,
        borderWidth,
        borderRadius: 5,
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {isInSearchMode ? (
        <View style={{ padding: 8 }}>
          <ThemedText>{`Found ${foundRoutes} route${foundRoutes !== 1 ? "s" : ""} for "${searchTerm}"`}</ThemedText>
        </View>
      ) : (
        <TextInput
          placeholder="Search..."
          value={searchTerm}
          onChangeText={handleSearchTermChange}
          style={{
            padding: 12,
            color: theme.text,
            width: "80%",
          }}
        />
      )}
      <Pressable onPress={handleSearch}>
        <FontAwesome
          size={20}
          name={isInSearchMode ? "times" : "search"}
          color={theme.tabIconDefault}
          style={{
            marginRight: 8,
          }}
        />
      </Pressable>
    </View>
  );
};

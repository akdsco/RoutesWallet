import { Pressable, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";
import { useSearchInput } from "@/components/SearchInput/SearchInput.hook";

export type SearchInputProps = {
  foundRoutes: number;
  executeSearch: (searchTerm: string) => void;
  onSearchReset: () => void;
  isInSearchMode: boolean;
  setIsInSearchMode: (isInSearchMode: boolean) => void;
};

export const SearchInput = (props: SearchInputProps) => {
  const { theme, searchTerm, onSearchTermChange, handleSearch } =
    useSearchInput(props);
  const { borderColor, borderWidth } = theme;
  const { foundRoutes, isInSearchMode } = props;

  return (
    <View
      style={{
        flex: 1,
        margin: 5,
        borderColor,
        borderWidth,
        borderRadius: 5,
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
          onChangeText={onSearchTermChange}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={{
            padding: 12,
            fontSize: 20,
            color: theme.text,
            width: "80%",
          }}
        />
      )}
      <Pressable onPress={handleSearch} style={{ padding: 14 }}>
        <FontAwesome
          size={22}
          name={isInSearchMode ? "times" : "search"}
          color={theme.icon}
        />
      </Pressable>
    </View>
  );
};

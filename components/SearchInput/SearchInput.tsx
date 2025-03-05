import { Pressable, StyleSheet, TextInput, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks";
import { Theme } from "@/library/theme";

export type SearchInputProps = {
  isFiltered: boolean;
  foundRoutes: number;
  searchTerm: string;
  onSearchTermChange: (text: string) => void;
  onSearchSubmit: () => void;
};

export const SearchInput = ({
  isFiltered,
  foundRoutes,
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
}: SearchInputProps) => {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.container}>
      {isFiltered ? (
        <View style={styles.foundLabel}>
          <ThemedText>{`Found ${foundRoutes} route${foundRoutes !== 1 ? "s" : ""} for "${searchTerm}"`}</ThemedText>
        </View>
      ) : (
        <TextInput
          placeholder="Search..."
          value={searchTerm}
          onChangeText={onSearchTermChange}
          onSubmitEditing={onSearchSubmit}
          returnKeyType="search"
          style={styles.textInput}
        />
      )}
      <Pressable onPress={onSearchSubmit} style={{ padding: 14 }}>
        <FontAwesome
          size={22}
          name={isFiltered ? "times" : "search"}
          color={theme.icon}
        />
      </Pressable>
    </View>
  );
};

const makeStyles = ({ borderColor, borderWidth, text }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      margin: 5,
      borderColor,
      borderWidth,
      borderRadius: 5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    foundLabel: { padding: 8 },
    textInput: {
      padding: 12,
      fontSize: 20,
      color: text,
      width: "80%",
    },
  });

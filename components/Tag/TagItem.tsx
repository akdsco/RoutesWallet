import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/hooks";

type TagItemProps = {
  tag: {
    id: number;
    name: string;
    color: string;
  };
};

export const TagItem = ({ tag }: TagItemProps) => {
  const theme = useTheme();
  const onPress = () => {
    console.debug(`Show "${tag.name}" tag only`);
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.tagItemContainer}>
        <View style={styles.tagAndNameContainer}>
          <FontAwesome
            size={40}
            name="tag"
            color={tag.color}
            style={styles.tag}
          />
          <ThemedText type="subtitle">{tag.name}</ThemedText>
        </View>
        <FontAwesome
          size={30}
          name="ellipsis-v"
          color={theme.text}
          style={styles.optionButton}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 5,
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 0.2,
  },
  tagItemContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "95%",
    margin: "auto",
  },
  tagAndNameContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  tag: {
    paddingRight: 14,
  },
  optionButton: {
    marginTop: 4,
  },
});

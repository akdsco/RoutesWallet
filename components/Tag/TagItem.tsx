import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/hooks";
import { router } from "expo-router";

type TagItemProps = {
  tag: {
    id: number;
    name: string;
    color: string;
  };
};

export const TagItem = ({ tag }: TagItemProps) => {
  const { theme } = useTheme();

  const showTaggedRoutes = () => {
    console.debug(`Show "${tag.name}" tag only`);
    router.push({
      pathname: `(tabs)/groups/${tag.id}`,
      params: { tagName: tag.name },
    });
  };

  const openTagItemSettings = () => {
    console.debug(`Open tag "${tag.name}" settings`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tagItemContainer}>
        <Pressable
          style={styles.tagAndNameContainer}
          onPress={showTaggedRoutes}
        >
          <FontAwesome
            size={32}
            name="tag"
            color={tag.color}
            style={styles.tag}
          />
          <ThemedText type="subtitle">{tag.name}</ThemedText>
        </Pressable>
        <Pressable
          style={styles.optionButtonContainer}
          onPress={openTagItemSettings}
        >
          <FontAwesome size={30} name="ellipsis-v" color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    margin: 3,
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 0.2,
  },
  tagItemContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    justifyContent: "space-between",
    width: "95%",
    margin: "auto",
  },
  tagAndNameContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 1,
    borderRadius: 5,
    // borderColor: "#ccc",
    // borderWidth: 0.2,
    width: "85%",
  },
  tag: {
    paddingRight: 18,
  },
  optionButtonContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
    borderRadius: 50,
    width: "13%",
    // borderColor: "#ccc",
    // borderWidth: 0.2,
  },
});

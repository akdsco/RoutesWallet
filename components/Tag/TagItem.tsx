import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "@/hooks";
import { router } from "expo-router";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

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

  const handleSelectedMenuOption = (value: string) => {
    console.debug(`Selected option: ${value} on tag "${tag.name}"`);

    switch (value) {
      case "edit":
        router.push({
          pathname: `(tabs)/editTag`,
          params: { tagId: tag.id },
        });
        break;
      case "remove":
        console.debug(`Remove tag "${tag.name}"`);
        break;
      default:
        break;
    }
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
        <Menu onSelect={(value) => handleSelectedMenuOption(value as string)}>
          <MenuTrigger style={styles.optionButtonContainer}>
            <FontAwesome size={25} name="ellipsis-v" color={theme.text} />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption value="edit" text="Edit" />
            <MenuOption value="remove" text="Remove" />
          </MenuOptions>
        </Menu>
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
    width: 32,
    borderRadius: 50,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // borderColor: "white",
    // borderWidth: 1,
  },
});

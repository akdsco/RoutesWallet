import { StyleSheet, TouchableOpacity, View } from "react-native";
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
import {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

type TagItemProps = {
  id: number;
  name: string;
  color: string;
  removeTag: (tagId: number) => Promise<void>;
};

export const TagItem = ({
  item,
  drag,
  isActive,
}: RenderItemParams<TagItemProps>) => {
  const { theme } = useTheme();

  const listTaggedRoutes = () => {
    console.debug(`Show "${item.name}" tag only`);
    router.push({
      pathname: `(tabs)/groups/${item.id}`,
      params: { tagName: item.name },
    });
  };

  const handleSelectedMenuOption = async (value: string) => {
    console.debug(`Selected option: ${value} on tag "${item.name}"`);

    switch (value) {
      case "edit":
        router.push({
          pathname: `(tabs)/editTag`,
          params: { tagId: item.id },
        });
        break;
      case "remove":
        await item.removeTag(item.id);
        break;
      default:
        break;
    }
  };

  return (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={styles.container}
        onPress={listTaggedRoutes}
      >
        <View style={styles.tagItemContainer}>
          <View style={styles.tagAndNameContainer}>
            <FontAwesome
              size={32}
              name="tag"
              color={item.color}
              style={styles.tag}
            />
            {/*TODO: Check if below 75% works on more screens? Adjust*/}
            <ThemedText type="subtitle" style={{ width: "75%" }}>
              {item.name}
            </ThemedText>
          </View>
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
      </TouchableOpacity>
    </ScaleDecorator>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 5,
    margin: 3,
    borderRadius: 5,
    borderColor: "#ccc",
    borderWidth: 0.3,
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
    padding: 10,
    borderRadius: 5,
    borderColor: "#ccc",
    // borderWidth: 0.2,
    // width: "85%",
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

import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
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
import Toast from "react-native-toast-message";

const colors = [
  "#FFB3B3", // pastel red
  "red",
  "#ADD8E6", // pastel blue
  "blue",
  "#B2F2B2", // pastel green
  "green",
  "#FFDAB3", // pastel orange
  "orange",
  "#DAB3FF", // pastel purple
  "purple",
  "#FFFFB3", // pastel yellow
  "yellow",
];

export type RemoveTag = (tagId: number) => Promise<void>;
export type UpdateTag = (
  tagId: number,
  name: string,
  color: string,
) => Promise<void>;

type TagItemProps = {
  id: number;
  name: string;
  color: string;
  removeTag: RemoveTag;
  updateTag: UpdateTag;
};

export const TagItem = ({
  item,
  drag,
  isActive,
}: RenderItemParams<TagItemProps>) => {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedColor, setEditedColor] = useState(item.color);

  const showTaggedRoutes = () => {
    if (isEditing) {
      // Currently editing, do not allow navigation (but we do allow navigation to other tags)
      return;
    }

    console.debug(`Show \"${item.name}\" routes`);
    router.push({
      pathname: `(tabs)/tags/${item.id}`,
      params: { tagName: item.name },
    });
  };

  const handleSelectedMenuOption = async (value: string) => {
    console.debug(
      `Menu selected option: ${value} tag \"${item.name}\", tagId: ${item.id}`,
    );

    switch (value) {
      case "edit":
        setIsEditing(true);
        break;
      case "remove":
        await item.removeTag(item.id);
        break;
      default:
        break;
    }
  };

  const saveChanges = async () => {
    const name = editedName.trim();
    if (name === "") {
      Toast.show({
        type: "error",
        text1: "Tag without a name",
        text2: "Try to make it slightly more descriptive",
        topOffset: 55,
      });
      return;
    }

    await item.updateTag(item.id, name, editedColor);
    setIsEditing(false);
  };

  return (
    <ScaleDecorator>
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={styles.container}
        onPress={showTaggedRoutes}
      >
        <View style={styles.tagItemContainer}>
          <View style={styles.tagAndNameContainer}>
            {isEditing ? (
              <TouchableOpacity
                onPress={() => {
                  const nextColorIndex =
                    (colors.indexOf(editedColor) + 1) % colors.length;
                  setEditedColor(colors[nextColorIndex]);
                }}
              >
                <FontAwesome
                  size={32}
                  name="tag"
                  color={editedColor}
                  style={styles.tag}
                />
              </TouchableOpacity>
            ) : (
              <FontAwesome
                size={32}
                name="tag"
                color={item.color}
                style={styles.tag}
              />
            )}

            {isEditing ? (
              <TextInput
                value={editedName}
                onChangeText={setEditedName}
                style={[styles.textInput, { color: theme.text }]}
                placeholder="Type in tag name"
              />
            ) : (
              <ThemedText type="subtitle" style={{ width: "75%" }}>
                {item.name}
              </ThemedText>
            )}
          </View>

          {isEditing ? (
            <TouchableOpacity
              onPress={saveChanges}
              style={styles.confirmButton}
            >
              <FontAwesome size={25} name="check" color="green" />
            </TouchableOpacity>
          ) : (
            <Menu
              onSelect={(value) => handleSelectedMenuOption(value as string)}
            >
              <MenuTrigger style={styles.optionButtonContainer}>
                <FontAwesome size={25} name="ellipsis-v" color={theme.text} />
              </MenuTrigger>
              <MenuOptions>
                <MenuOption value="edit" text="Edit" />
                <MenuOption value="remove" text="Remove" />
              </MenuOptions>
            </Menu>
          )}
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
  },
  tag: {
    paddingRight: 18,
  },
  textInput: {
    fontSize: 18,
    borderBottomWidth: 0.5,
    borderColor: "#ccc",
    width: "75%",
  },
  optionButtonContainer: {
    width: 32,
    borderRadius: 50,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButton: {
    padding: 5,
    borderRadius: 5,
  },
});

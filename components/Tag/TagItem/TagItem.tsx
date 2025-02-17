import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
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
import { ThemeContextType } from "@/library/theme";
import { TagWithFunctions } from "@/library/types";
import { useTagItem } from "@/components/Tag/TagItem/TagItem.hook";
import { useTheme } from "@/hooks";

export const TagItem = ({
  item,
  drag,
  isActive,
}: RenderItemParams<TagWithFunctions>) => {
  const {
    isEditing,
    editedName,
    setEditedName,
    editedColor,
    saveChanges,
    showTaggedRoutes,
    handleSelectedMenuOption,
    onEditedTagPress,
  } = useTagItem(item);

  const themeContext = useTheme();
  const styles = makeStyles(themeContext);
  const { theme } = themeContext;

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
              <TouchableOpacity onPress={onEditedTagPress}>
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
            <Menu onSelect={(value: string) => handleSelectedMenuOption(value)}>
              <MenuTrigger style={styles.optionButtonContainer}>
                <FontAwesome size={25} name="ellipsis-v" color={theme.text} />
              </MenuTrigger>
              <MenuOptions>
                <MenuOption value="edit" text="Edit" />
                <MenuOption value="delete" text="Delete" />
              </MenuOptions>
            </Menu>
          )}
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
};

const makeStyles = ({ colorMode }: ThemeContextType) =>
  StyleSheet.create({
    container: {
      paddingVertical: 5,
      margin: 3,
      borderRadius: 5,
      borderColor: "#ccc",
      borderWidth: colorMode === "light" ? 1 : 0.3,
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

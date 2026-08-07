import { useState } from "react";
import { log } from "@/library/logger";
import { router } from "expo-router";
import { Toast } from "@/library/Toast";
import { TagWithFunctions } from "@/library/types";

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

export const useTagItem = (item: TagWithFunctions) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedColor, setEditedColor] = useState(item.color);

  const showTaggedRoutes = () => {
    if (isEditing) {
      // Currently editing, do not allow navigation (but we do allow navigation to other tags)
      return;
    }

    log.debug("useTagItem", `Show \"${item.name}\" routes`);
    router.push({
      // @ts-ignore
      pathname: `(tabs)/tags/${item.id}`,
      params: { tagName: item.name },
    });
  };

  const handleSelectedMenuOption = async (value: string) => {
    log.info(
      "useTagItem",
      `Menu selected option: ${value} tag \"${item.name}\", tagId: ${item.id}`,
    );

    switch (value) {
      case "edit":
        setIsEditing(true);
        break;
      case "delete":
        await item.removeTag(item.id);
        break;
      default:
        break;
    }
  };

  const saveChanges = async () => {
    const name = editedName.trim();
    if (name === "") {
      Toast(
        "error",
        "Tag without a name",
        "Try to make it slightly more descriptive",
      );
      return;
    }

    const updateResult = await item.updateTag({
      id: item.id,
      name,
      color: editedColor,
    });

    if (!updateResult.success) {
      Toast("error", "Error when updating tag", updateResult.error);
      return;
    }

    log.info("useTagItem", `Tag updated: ${item.name} -> ${name}`, {
      item,
      name,
      editedColor,
    });
    setIsEditing(false);
  };

  const onEditedTagPress = () => {
    const nextColorIndex = (colors.indexOf(editedColor) + 1) % colors.length;
    setEditedColor(colors[nextColorIndex]);
  };

  return {
    isEditing,
    showTaggedRoutes,
    editedName,
    setEditedName,
    editedColor,
    setEditedColor,
    saveChanges,
    handleSelectedMenuOption,
    onEditedTagPress,
  };
};

import { ListItem } from "@rneui/themed";
import React from "react";
import { TagWithAssignment } from "@/library/types";
import { useTheme } from "@/hooks";
import { TouchableOpacity } from "react-native";

type TagToggleItemProps = {
  item: TagWithAssignment;
  handleTagToggle: (tagId: number, isAssigned: boolean) => void;
};

export const TagToggleItem = ({
  item,
  handleTagToggle,
}: TagToggleItemProps) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => handleTagToggle(item.id, item.isAssigned)}
    >
      <ListItem
        bottomDivider
        onPress={() => handleTagToggle(item.id, item.isAssigned)}
        style={{ backgroundColor: theme.background }}
      >
        <ListItem.CheckBox
          iconType="material-community"
          checkedIcon="checkbox-marked"
          uncheckedIcon="checkbox-blank-outline"
          checked={item.isAssigned}
          onPress={() => handleTagToggle(item.id, item.isAssigned)}
        />
        <ListItem.Content style={{ backgroundColor: theme.background }}>
          <ListItem.Title style={{ color: theme.text }}>
            {item.name}
          </ListItem.Title>
        </ListItem.Content>
      </ListItem>
    </TouchableOpacity>
  );
};

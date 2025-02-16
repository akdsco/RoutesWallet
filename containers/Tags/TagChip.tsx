import React from "react";
import { TagWithAssignment } from "@/library/types";
import { Chip } from "@rneui/base";
import { useTheme } from "@/hooks";

type TagChipProps = { tag: TagWithAssignment };

export const TagChip = ({ tag }: TagChipProps) => {
  const { theme } = useTheme();

  return (
    <Chip
      key={tag.id}
      title={tag.name}
      type="outline"
      titleStyle={{
        fontSize: 12,
        color: theme.text,
      }}
      buttonStyle={{
        borderColor: tag.color,
        borderWidth: 1.2,
      }}
      icon={{
        name: "tag",
        type: "font-awesome",
        size: 12,
        color: tag.color,
      }}
      size="sm"
      containerStyle={{
        padding: 1,
      }}
    />
  );
};

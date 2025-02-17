import React from "react";
import { TagWithAssignment } from "@/library/types";
import { Chip } from "@rneui/base";
import { useTheme } from "@/hooks";

export const TagChip = ({ id, name, color }: TagWithAssignment) => {
  const { theme } = useTheme();

  return (
    <Chip
      key={id}
      title={name}
      type="outline"
      titleStyle={{
        fontSize: 12,
        color: theme.text,
      }}
      buttonStyle={{
        borderColor: color,
        borderWidth: 1.2,
      }}
      icon={{
        name: "tag",
        type: "font-awesome",
        size: 12,
        color: color,
      }}
      size="sm"
      containerStyle={{
        padding: 1,
      }}
    />
  );
};

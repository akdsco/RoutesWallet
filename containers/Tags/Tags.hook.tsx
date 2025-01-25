import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";
import { RemoveTag, UpdateTag } from "@/components/Tag/TagItem";

type RawTag = {
  id: number;
  name: string;
  color: string;
};

type Tag = RawTag & {
  removeTag: RemoveTag;
  updateTag: UpdateTag;
};

export const useGroups = () => {
  const db = useSQLiteContext();
  const [tags, setTags] = useState<Tag[]>([]);

  const getTags = async () => {
    const sql = `SELECT * FROM RouteTags`;

    try {
      const tagsWithoutFunctions = await db.getAllAsync<RawTag>(sql);

      const tags: Tag[] = tagsWithoutFunctions.map((tag) => ({
        ...tag,
        removeTag,
        updateTag,
      }));

      return tags;
    } catch (error) {
      console.debug("SQL: Error when fetching tags", error);
      throw error;
    }
  };

  const removeTag = async (tagId: number) => {
    const executeRemoval = async () => {
      const sql = `DELETE FROM RouteTags WHERE id = ?`;

      try {
        await db.runAsync(sql, [tagId]);
        console.debug(`SQL: Tag id "${tagId}" removed`);
        await checkTags();
      } catch (error) {
        console.error("Error executing SQL", error);
        throw new Error("Error removing tag");
      }
    };

    Alert.alert(
      "Are you sure you want to remove this tag?",
      "All the route assignments will also be removed",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Pressed"),
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            console.log("OK Pressed");
            executeRemoval();
          },
          style: "destructive",
        },
      ],
    );
  };

  const updateTag: UpdateTag = async (tagId, name, color) => {
    const sql = `
      UPDATE RouteTags
      SET name = ?, color = ?
      WHERE id = ?;
    `;

    try {
      await db.runAsync(sql, [name, color, tagId]);
      console.debug(`SQL: Tag id "${tagId}" updated`);
      await checkTags();
    } catch (error) {
      console.error("Error executing SQL", error);
      throw new Error("Error updating tag");
    }
  };

  const checkTags = async () => {
    const tags = await getTags();
    setTags(tags);
  };

  useEffect(() => {
    checkTags().then();
  }, []);

  return {
    tags,
    setTags,
    removeTag,
    checkTags,
  };
};

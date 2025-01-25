import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

type Tag = {
  id: number;
  name: string;
  color: string;
  removeTag: (tagId: number) => Promise<void>;
};

export const useGroups = () => {
  const db = useSQLiteContext();
  const [tags, setTags] = useState<Tag[]>([]);

  const getTags = async () => {
    const sql = `SELECT * FROM RouteTags`;

    try {
      return await db.getAllAsync<Tag>(sql);
    } catch (error) {
      console.debug("SQL: Error when fetching tags", error);
      throw error;
    }
  };

  const removeTag = async (tagId: number) => {
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

  const checkTags = async () => {
    const tags = await getTags();
    setTags(tags.map((tag) => ({ ...tag, removeTag })));
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

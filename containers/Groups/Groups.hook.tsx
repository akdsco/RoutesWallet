import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";

type Tag = {
  id: number;
  name: string;
  color: string;
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
    checkTags,
  };
};

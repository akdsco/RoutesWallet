import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Alert } from "react-native";
import { RemoveTag, UpdateTag } from "@/components/Tag/TagItem";
import { useApp } from "@/hooks";

type RawTag = {
  id: number;
  name: string;
  color: string;
};

type Tag = RawTag & {
  removeTag: RemoveTag;
  updateTag: UpdateTag;
};

export const useTags = () => {
  const db = useSQLiteContext();
  const { athleteId } = useApp();
  const [tags, setTags] = useState<Tag[]>([]);

  const getTags = async (athleteId: number | null) => {
    if (!athleteId) return [];

    const sql = `
      SELECT rt.id, rt.name, rt.color
      FROM RouteTags rt
      LEFT JOIN AthleteTagOrder ato ON rt.id = ato.tag_id AND ato.athlete_id = ?
      ORDER BY ato.order_position IS NULL, ato.order_position ASC, rt.id DESC;
    `;

    try {
      const tagsWithoutFunctions = await db.getAllAsync<RawTag>(sql, [
        athleteId,
      ]);

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
      const deleteTagSql = `DELETE FROM RouteTags WHERE id = ?`;
      const deleteOrderSql = `DELETE FROM AthleteTagOrder WHERE tag_id = ? AND athlete_id = ?`;
      const updateOrderSql = `
        UPDATE AthleteTagOrder
        SET order_position = order_position - 1
        WHERE athlete_id = ? AND order_position > (
          SELECT order_position FROM AthleteTagOrder WHERE tag_id = ? AND athlete_id = ?
        );
    `;

      try {
        await db.withExclusiveTransactionAsync(async (tx) => {
          // Step 1: Remove the tag from RouteTags
          await tx.runAsync(deleteTagSql, [tagId]);

          const result = await tx.getAllAsync(
            `SELECT * FROM AthleteTagOrder WHERE tag_id = ? AND athlete_id = ?`,
            [tagId, athleteId],
          );

          if (result.length > 0) {
            // Step 2: Remove order from the AthleteTagOrder table (because order actually exists)
            await tx.runAsync(deleteOrderSql, [tagId, athleteId]);

            // Step 3: Recalculate the order positions for remaining tags
            await tx.runAsync(updateOrderSql, [athleteId, tagId, athleteId]);

            console.debug(`SQL: Tag id "${tagId}" removed and order updated`);
          } else {
            console.debug(`SQL: Tag id "${tagId}" removed`);
          }
        });

        await checkTags();
      } catch (error) {
        console.error("SQL: Error executing", error, tagId, athleteId);
        throw new Error("Error when removing tag and updating tag order");
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
    const tags = await getTags(athleteId);
    setTags(tags);
  };

  const onSetTags = async (tags: Tag[], saveOrderInDb = false) => {
    if (saveOrderInDb) {
      console.debug("DB: Saving tags order");

      const insertSql = `
        INSERT INTO AthleteTagOrder (athlete_id, tag_id, order_position)
        VALUES (?, ?, ?)
        ON CONFLICT (athlete_id, tag_id) DO UPDATE SET order_position = excluded.order_position;
      `;

      try {
        await db.withExclusiveTransactionAsync(async (tx) => {
          for (let i = 0; i < tags.length; i++) {
            const tag = tags[i];
            await tx.runAsync(insertSql, [athleteId, tag.id, i]);
          }
        });

        console.debug("DB: Tag order saved");
      } catch (error) {
        console.error("Error saving tag order", error);
        throw error;
      }
    }

    setTags(tags);
  };

  useEffect(() => {
    checkTags().then();
  }, []);

  return {
    tags,
    setTags: onSetTags,
    removeTag,
    checkTags,
  };
};

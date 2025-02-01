import { isConstraintError, isSQLiteError } from "@/db/error";
import { log, logDb } from "@/library/logger";
import { SQLiteDatabase } from "expo-sqlite";
import { tables } from "@/db/tables";
import { Toast } from "@/library/Toast";
import { Tag } from "@/library/types";

export const insertTag = (db: SQLiteDatabase) => async (tagName: string) => {
  const query = `INSERT INTO ${tables.routeTags} (name) VALUES ('${tagName}')`;

  try {
    logDb.debug(tables.routeTags, "INSERT", query, { tagName });
    await db.execAsync(query);
  } catch (error) {
    if (isSQLiteError(error)) {
      if (isConstraintError(error)) {
        Toast("error", "Tag already exists", "Try a different name");
        return log.error("addRouteTag", "Tag most likely already exists", {
          error,
        });
      }
    }
    log.error("insertRouteTag", "Error inserting tag", { error });
    throw error;
  }
};

export const updateAthleteTagOrderToTop =
  (db: SQLiteDatabase) => async (athleteId: number, tagName: string) => {
    const tagId = await getTagIdByName(db)(tagName);
    await updateTagOrderToTop(db)(athleteId, tagId);
  };

const getTagIdByName = (db: SQLiteDatabase) => async (tagName: string) => {
  try {
    const sql = `SELECT id FROM ${tables.routeTags} WHERE name = '${tagName}'`;

    logDb.debug(tables.routeTags, "SELECT", sql, { tagName });
    const result = await db.getAllAsync<{ id: number }>(sql);
    const tagId = result[0]?.id;

    if (!tagId) {
      throw new Error("Failed to retrieve tag ID after insertion");
    }

    return tagId;
  } catch (error) {
    log.error("getTagIdByName", "Error fetching tag ID", { error });
    throw error;
  }
};

const updateTagOrderToTop =
  (db: SQLiteDatabase) => async (athleteId: number, tagId: number) => {
    try {
      // Set the new tag as the first in the order

      const updateOrderSql = `
      -- Shift existing tags for the athlete down by 1
      UPDATE AthleteTagOrder
      SET order_position = order_position + 1
      WHERE athlete_id = ${athleteId};

      -- Insert the new tag at the first position
      INSERT INTO AthleteTagOrder (athlete_id, tag_id, order_position)
      VALUES (${athleteId}, ${tagId}, 1);
    `;
      logDb.debug(tables.athleteTagOrder, "INSERT", updateOrderSql, {
        athleteId,
        tagId,
      });

      await db.execAsync(updateOrderSql);
    } catch (error) {
      log.error(
        "updateTagOrderToTop",
        "Error updating tag order to the first on the list",
        {
          error,
        },
      );
    }
  };

export const saveTagOrderInDb =
  (db: SQLiteDatabase) => async (athleteId: number, tags: Tag[]) => {
    const { athleteTagOrder } = tables;

    const query = `
        INSERT INTO ${athleteTagOrder} (athlete_id, tag_id, order_position)
        VALUES (?, ?, ?)
        ON CONFLICT (athlete_id, tag_id) DO UPDATE SET order_position = excluded.order_position;
      `;

    logDb.debug(athleteTagOrder, "INSERT", query, { athleteId, tags });

    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i];
          await tx.runAsync(query, [athleteId, tag.id, i]);
        }
      });

      log.debug("saveTagOrderInDb", "Tag order saved");
    } catch (error) {
      log.error("saveTagOrderInDb", "Error saving tag order", { error });
      throw error;
    }
  };

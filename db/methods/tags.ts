import { isConstraintError, isSQLiteError } from "@/db/error";
import { log, logDb } from "@/library/logger";
import { SQLiteDatabase } from "expo-sqlite";
import { tables } from "@/db/tables";
import { Toast } from "@/library/Toast";
import { AthleteTagOrder, RawTag, TagWithFunctions } from "@/library/types";

export const insertDefaultTagOrder =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const query = `
    INSERT INTO ${tables.athleteTagOrder} (athlete_id, tag_id, order_position)
    SELECT ${athleteId} AS athlete_id,
      id AS tag_id,
      ROW_NUMBER() OVER (ORDER BY id) AS order_position
    FROM RouteTags;
  `;
    logDb.debug(tables.athleteTagOrder, "INSERT", query, { athleteId });
    try {
      await db.execAsync(query);
    } catch (error) {
      logDb.error(tables.athleteTagOrder, "INSERT", query, { athleteId });
    }
  };

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
  (db: SQLiteDatabase) =>
  async (athleteId: number, tags: TagWithFunctions[]) => {
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

export const removeTagFromDb =
  (db: SQLiteDatabase) => async (tagId: number, athleteId: number) => {
    const fnName = "removeTagFromDb";

    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        // Remove the tag from RouteTags
        const deleteTagSql = `DELETE FROM ${tables.routeTags} WHERE id = ?`;
        logDb.debug(tables.routeTags, "DELETE", deleteTagSql, {
          tagId,
          athleteId,
        });
        await tx.runAsync(deleteTagSql, [tagId]);

        // Check if the order exists
        const checkOrderSqlQuery = `SELECT * FROM ${tables.athleteTagOrder} WHERE tag_id = ? AND athlete_id = ?`;
        logDb.debug(tables.athleteTagOrder, "SELECT", checkOrderSqlQuery, {
          tagId,
          athleteId,
        });
        const orderExistsInDb =
          (
            await tx.getAllAsync<AthleteTagOrder>(checkOrderSqlQuery, [
              tagId,
              athleteId,
            ])
          ).length > 0;

        if (orderExistsInDb) {
          // Remove order from the AthleteTagOrder table
          const deleteOrderSql = `DELETE FROM ${tables.athleteTagOrder} WHERE tag_id = ? AND athlete_id = ?`;
          logDb.debug(tables.athleteTagOrder, "DELETE", deleteOrderSql, {
            tagId,
            athleteId,
          });
          await tx.runAsync(deleteOrderSql, [tagId, athleteId]);

          // Recalculate the order positions for remaining tags
          const updateOrderSql = `
            UPDATE ${tables.athleteTagOrder}
            SET order_position = order_position - 1
            WHERE athlete_id = ? AND order_position > (
              SELECT order_position FROM ${tables.athleteTagOrder} WHERE tag_id = ? AND athlete_id = ?
            );
          `;
          logDb.debug(tables.athleteTagOrder, "UPDATE", updateOrderSql, {
            tagId,
            athleteId,
          });
          await tx.runAsync(updateOrderSql, [athleteId, tagId, athleteId]);

          log.debug(fnName, `Tag id "${tagId}" removed and tag order updated`);
        } else {
          log.debug(fnName, `Tag id "${tagId}" removed`);
        }
      });

      // await checkTags();
    } catch (error) {
      console.error("SQL: Error executing", error, tagId, athleteId);
      log.error("removeTagFromDb", "Error when removing tag", {
        error,
        athleteId,
        tagId,
      });
    }
  };

export const updateTagInDb = (db: SQLiteDatabase) => async (tag: RawTag) => {
  const fnName = "updateTagInDb";
  const query = `UPDATE ${tables.routeTags} SET name = ?, color = ? WHERE id = ?;`;

  try {
    logDb.debug(tables.routeTags, "UPDATE", query, { newTag: tag });
    await db.runAsync(query, [tag.name, tag.color, tag.id]);
    log.debug(fnName, `Tag id "${tag.id}" updated`);
  } catch (error) {
    log.error(fnName, "Error updating tag", { error, tag, query });
    throw error;
  }
};

export const getOrderedRawTagsFromDb =
  (db: SQLiteDatabase) => async (athleteId: number | null) => {
    if (!athleteId) return [];

    const query = `
      SELECT rt.id, rt.name, rt.color
      FROM ${tables.routeTags} rt
      LEFT JOIN ${tables.athleteTagOrder} ato ON rt.id = ato.tag_id AND ato.athlete_id = ?
      ORDER BY ato.order_position IS NULL, ato.order_position ASC, rt.id DESC;
    `;

    logDb.debug(tables.routeTags, "SELECT", query, { athleteId });

    try {
      return await db.getAllAsync<RawTag>(query, [athleteId]);
    } catch (error) {
      log.error("getOrderedTagsFromDb", "Error when fetching tags", {
        error,
        athleteId,
        query,
      });
      throw error;
    }
  };

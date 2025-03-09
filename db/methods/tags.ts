import {
  isError,
  isSqlConstraintError,
  isSQLiteError,
  runDbWithLogging,
} from "@/db/error";
import { log, logDb } from "@/library/logger";
import { SQLiteDatabase } from "expo-sqlite";
import { tables } from "@/db/tables";
import {
  AthleteTagOrder,
  DbOperationResult,
  RawTag,
  TagWithAssignment,
  TagWithFunctions,
} from "@/library/types";
import { DEFAULT_TAG_COLOR } from "@/library/theme";

export const insertDefaultTagOrderInDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const checkQuery = `SELECT COUNT(*) as count FROM ${tables.athleteTagOrder} WHERE athlete_id = ?;`;

    const insertQuery = `
        INSERT INTO ${tables.athleteTagOrder} (athlete_id, tag_id, order_position)
        SELECT ? AS athlete_id,
          id AS tag_id,
          ROW_NUMBER() OVER (ORDER BY id) AS order_position
        FROM RouteTags;
      `;

    try {
      const result = await db.getFirstAsync<{ count: number }>(checkQuery, [
        athleteId,
      ]);

      if (result && result.count > 0) {
        logDb.info(tables.athleteTagOrder, `Order already exists`, {
          athleteId,
        });
        return;
      }

      logDb.debug(tables.athleteTagOrder, insertQuery, { athleteId });
      await db.runAsync(insertQuery, [athleteId]);
    } catch (error) {
      if (isError(error))
        if (isError(error)) {
          logDb.error(tables.athleteTagOrder, error, insertQuery, {
            athleteId,
            error,
          });
        }
      throw error;
    }
  };

export const insertTag =
  (db: SQLiteDatabase) =>
  async (
    tagName: string,
    tagColor?: string,
  ): DbOperationResult<{ tagId: number }> => {
    const colorValue = tagColor || DEFAULT_TAG_COLOR;
    const query = `INSERT INTO ${tables.routeTags} (name, color) VALUES ('${tagName}', '${colorValue}')`;

    try {
      await db.execAsync(query);
      logDb.debug(tables.routeTags, query, { tagName });

      const queryInsertId = `SELECT last_insert_rowid() as id`;
      const result = await db.getFirstAsync<{ id: number }>(queryInsertId);

      if (!result) {
        return { success: false, error: "Tag not inserted" };
      }

      return {
        success: true,
        data: { tagId: result.id },
      };
    } catch (error) {
      if (isSQLiteError(error)) {
        if (isSqlConstraintError(error)) {
          log.warn("addRouteTag", "Tag most likely already exists", {
            error: error.message,
            query,
          });
          return { success: false, error: "Tag already exists" };
        }
      }
      // TODO: write function that can handle db errors with msg and reuse
      log.error("insertTag", "Error inserting tag", {
        error,
        errorMsg: (error as Error).message,
      });
      throw error;
    }
  };

export const handleRouteTagInsert =
  (db: SQLiteDatabase) =>
  async (athleteId: number, tagName: string): DbOperationResult<void> => {
    const insertResult = await insertTag(db)(tagName);
    if (!insertResult.success) {
      return insertResult;
    }

    await updateAthleteTagOrderToTop(db)(athleteId, tagName);

    return {
      success: true,
      data: undefined,
    };
  };

const updateAthleteTagOrderToTop =
  (db: SQLiteDatabase) => async (athleteId: number, tagName: string) => {
    const tagId = await getTagIdByName(db)(tagName);

    if (!tagId) {
      log.error("updateTagOrderToTop", "Tag ID not found", { tagName });
      return;
    }

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
      logDb.debug(tables.athleteTagOrder, updateOrderSql, {
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

export const getTagIdByName =
  (db: SQLiteDatabase) => async (tagName: string) => {
    try {
      const sql = `SELECT id FROM ${tables.routeTags} WHERE name = '${tagName}'`;

      logDb.debug(tables.routeTags, sql, { tagName });
      const result = await db.getAllAsync<{ id: number }>(sql);
      const tagId = result[0]?.id;

      if (!tagId) {
        return null;
      }

      return tagId;
    } catch (error) {
      log.error("getTagIdByName", "Error fetching tag ID", { error });
      throw error;
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

    logDb.debug(athleteTagOrder, query, { athleteId, tags });

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
  (db: SQLiteDatabase) => async (athleteId: number, tagId: number) => {
    const fnName = "removeTagFromDb";

    try {
      await db.withExclusiveTransactionAsync(async (tx) => {
        // Remove the tag from RouteTags
        const deleteTagSql = `DELETE FROM ${tables.routeTags} WHERE id = ?`;
        logDb.debug(tables.routeTags, deleteTagSql, {
          tagId,
          athleteId,
        });
        await tx.runAsync(deleteTagSql, [tagId]);

        // Check if the order exists
        const checkOrderSqlQuery = `SELECT * FROM ${tables.athleteTagOrder} WHERE tag_id = ? AND athlete_id = ?`;
        logDb.debug(tables.athleteTagOrder, checkOrderSqlQuery, {
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
          logDb.debug(tables.athleteTagOrder, deleteOrderSql, {
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
          logDb.debug(tables.athleteTagOrder, updateOrderSql, {
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

export const updateTagInDb =
  (db: SQLiteDatabase) =>
  async (tag: RawTag, athleteId: number): DbOperationResult<void> => {
    const listOfCurrentTags = await getOrderedRawTagsFromDb(db)(athleteId);
    const tagExists = listOfCurrentTags.find(({ name }) => name === tag.name);

    if (tagExists && tagExists.id !== tag.id) {
      return { success: false, error: "Tag already exists" };
    }

    const fnName = "updateTagInDb";
    const query = `UPDATE ${tables.routeTags} SET name = ?, color = ? WHERE id = ?;`;

    try {
      logDb.debug(tables.routeTags, query, { newTag: tag });
      await db.runAsync(query, [tag.name, tag.color, tag.id]);
      log.debug(fnName, `Tag id "${tag.id}" updated`);

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      log.error(fnName, "Error updating tag", { error, tag, query });
      throw error;
    }
  };

export const getOrderedRawTagsFromDb =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const query = `
      SELECT rt.id, rt.name, rt.color
      FROM ${tables.routeTags} rt
      LEFT JOIN ${tables.athleteTagOrder} ato ON rt.id = ato.tag_id AND ato.athlete_id = ?
      ORDER BY ato.order_position IS NULL, ato.order_position ASC, rt.id DESC;
    `;

    logDb.debug(tables.routeTags, query, { athleteId });

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

export const assignTagToRoute =
  (db: SQLiteDatabase) => async (tagId: number, routeId: string) => {
    // TODO: should we also be saving athleteID in this table??
    const { routeTagAssignments } = tables;
    const query = `INSERT INTO ${routeTagAssignments} (route_id, tag_id) VALUES (?, ?) ON CONFLICT(route_id, tag_id) DO NOTHING`;
    const data = [routeId, tagId];

    const result = await runDbWithLogging(() => db.runAsync(query, data), {
      table: routeTagAssignments,
      query,
      fnName: "assignTagToRoute",
      data,
    });

    return result;
  };

export const getAssignedTagsForRoute =
  (db: SQLiteDatabase) => async (routeId: string) => {
    const query = `
      SELECT 
        rt.id, 
        rt.name, 
        rt.color, 
        CASE 
            WHEN rta.tag_id IS NOT NULL THEN 1 
            ELSE 0 
        END AS isAssigned
      FROM ${tables.routeTags} rt
      LEFT JOIN ${tables.routeTagAssignments} rta ON rt.id = rta.tag_id AND rta.route_id = ?
      ORDER BY rt.name;
    `;

    try {
      logDb.debug(tables.routeTags, query, { routeId });
      return await db.getAllAsync<TagWithAssignment>(query, [routeId]);
    } catch (error) {
      if (isError(error))
        logDb.error(tables.routeTags, error, query, { routeId, error });
      throw error;
    }
  };

export const removeTagFromRoute =
  (db: SQLiteDatabase) => async (tagId: number, routeId: string) => {
    const query = `DELETE FROM ${tables.routeTagAssignments} WHERE tag_id = ? AND route_id = ?`;

    try {
      await db.runAsync(query, [tagId, routeId]);
      logDb.debug(tables.routeTagAssignments, query, { tagId, routeId });
    } catch (error) {
      if (isError(error))
        logDb.error(tables.routeTagAssignments, error, query, {
          tagId,
          routeId,
          error,
        });
    }
  };

export const getRouteIdsByTagId =
  (db: SQLiteDatabase) =>
  async (tagId: number): Promise<string[]> => {
    try {
      const query = `SELECT route_id FROM RouteTagAssignments WHERE tag_id = ?`;

      const results = await db.getAllAsync<{ route_id: string }>(query, [
        tagId,
      ]);

      const routeIds = results.map(({ route_id }) => route_id);

      log.info("useTaggedRoutes", `Fetched route IDs for tag ${tagId}`, {
        routeIds,
      });

      return routeIds;
    } catch (error) {
      // TODO: notify user of error?
      log.error("useTaggedRoutes", "Error fetching route IDs by tag", {
        error,
      });
      return [];
    }
  };

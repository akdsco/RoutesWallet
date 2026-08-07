import {
  isError,
  isSqlConstraintError,
  isSQLiteError,
  runDbWithLogging,
} from "@/db/error";
import { log, logDb } from "@/library/logger";
import { SQLiteDatabase, SQLiteRunResult } from "expo-sqlite";
import { tables } from "@/db/tables";
import {
  AthleteTagOrder,
  DbOpPromiseResult,
  DbOpResult,
  IdentifiableNumber,
  RawTag,
  TagWithAssignment,
  TagWithFunctions,
} from "@/library/types";
import { DEFAULT_TAG_COLOR } from "@/library/theme";

export const getTagOrderCount =
  (db: SQLiteDatabase) => async (athleteId: number) => {
    const { athleteTagOrder } = tables;
    const query = `SELECT COUNT(*) as count FROM ${athleteTagOrder} WHERE athlete_id = ?;`;
    const data = [athleteId];

    const result = await runDbWithLogging(
      () => db.getFirstAsync<{ count: number }>(query, data),
      {
        fnName: "getTagOrderCount",
        table: athleteTagOrder,
        query,
        data,
      },
    );

    if (!result) {
      return 0 as number;
    }

    return result.count;
  };

export const insertDefaultTagOrderInDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<void> => {
    const tagsOrderCount = await getTagOrderCount(db)(athleteId);

    if (tagsOrderCount > 0) {
      return;
    }

    const { athleteTagOrder } = tables;
    const query = `
        INSERT INTO ${athleteTagOrder} (athlete_id, tag_id, order_position)
        SELECT ? AS athlete_id,
          id AS tag_id,
          ROW_NUMBER() OVER (ORDER BY id) AS order_position
        FROM RouteTags;
      `;
    const data = [athleteId];

    await runDbWithLogging(() => db.runAsync(query, data), {
      fnName: "insertDefaultTagOrderInDb",
      table: athleteTagOrder,
      query,
      data,
    });
  };

export const insertTag =
  (db: SQLiteDatabase) =>
  async (
    tagName: string,
    tagColor?: string,
  ): DbOpPromiseResult<IdentifiableNumber> => {
    const tagColour = tagColor || DEFAULT_TAG_COLOR;
    const { routeTags } = tables;
    const query = `INSERT INTO ${routeTags} (name, color) VALUES (?, ?)`;
    const data = [tagName, tagColour];

    const result = await runDbWithLogging<
      SQLiteRunResult | DbOpResult<IdentifiableNumber>
    >(
      () => db.runAsync(query, data),
      {
        fnName: "insertTag",
        table: routeTags,
        query,
        data,
      },
      (error) => {
        if (isSQLiteError(error) && isSqlConstraintError(error)) {
          log.warn(
            "addRouteTag",
            "Tag most likely already exists? Check data, assess UX",
            {
              error: error.message,
              query,
            },
          );

          return {
            success: false,
            error: "Tag with this name already exists, choose different name",
          };
        }

        if (isError(error)) {
          log.error("insertTag", "Error inserting tag", {
            eMsg: error.message,
            eStack: error.stack,
            query,
          });
        } else {
          log.error("insertTag", "Unknown error when inserting tag", {
            error: JSON.stringify(error),
            query,
          });
        }

        return { success: false, error: "Unknown error when inserting tag" };
      },
    );

    if ("lastInsertRowId" in result) {
      return { success: true, data: { id: result.lastInsertRowId } };
    }

    return result;
  };

export const handleRouteTagInsert =
  (db: SQLiteDatabase) =>
  async (
    athleteId: number,
    tagName: string,
  ): DbOpPromiseResult<IdentifiableNumber> => {
    const tagInsertResult = await insertTag(db)(tagName);

    if (!tagInsertResult.success) {
      return tagInsertResult;
    }

    await updateAthleteTagOrderToTop(db)(athleteId, tagInsertResult.data.id);

    return {
      success: true,
      data: tagInsertResult.data,
    };
  };

const updateAthleteTagOrderToTop =
  (db: SQLiteDatabase) => async (athleteId: number, tagId: number) => {
    const { athleteTagOrder } = tables;
    const query = `
      -- Shift existing tags for the athlete down by 1
        UPDATE ${athleteTagOrder}
        SET order_position = order_position + 1
        WHERE athlete_id = ${athleteId};

      -- Insert the new tag at the first position
        INSERT INTO ${athleteTagOrder} (athlete_id, tag_id, order_position)
        VALUES (${athleteId}, ${tagId}, 1);
    `;

    const updateQuery = `
        UPDATE ${athleteTagOrder}
        SET order_position = order_position + 1
        WHERE athlete_id = ?`;
    const updateData = [athleteId];

    const insertQuery = `
        INSERT INTO ${athleteTagOrder} (athlete_id, tag_id, order_position) VALUES (?, ?, 1)`;
    const insertData = [athleteId, tagId];

    // TODO: improve UX if/when below fails?
    await runDbWithLogging(
      () => {
        return Promise.all([
          db.runAsync(updateQuery, updateData),
          db.runAsync(insertQuery, insertData),
        ]);
      },
      {
        fnName: "updateAthleteTagOrderToTop",
        table: athleteTagOrder,
        query,
        data: [updateData, insertData],
      },
    );
  };

export const getTagIdByName =
  (db: SQLiteDatabase) =>
  async (tagName: string): Promise<null | number> => {
    const { routeTags } = tables;
    const query = `SELECT id FROM ${routeTags} WHERE name = ?`;
    const data = [tagName];

    const result = await runDbWithLogging(
      () => db.getAllAsync<{ id: number }>(query, data),
      {
        fnName: "getTagIdByName",
        table: routeTags,
        query,
        data,
      },
    );

    if (result.length === 0 || !result[0]) {
      return null;
    }

    return result[0].id;
  };

export const saveTagOrderInDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number, tags: TagWithFunctions[]): Promise<void> => {
    const { athleteTagOrder } = tables;
    const query = `
      INSERT INTO ${athleteTagOrder} (athlete_id, tag_id, order_position)
      VALUES (?, ?, ?)
      ON CONFLICT (athlete_id, tag_id) DO UPDATE SET order_position = excluded.order_position;
    `;
    const data = [athleteId, tags];

    await runDbWithLogging(
      () => {
        return db.withExclusiveTransactionAsync(async (tx) => {
          for (let i = 0; i < tags.length; i++) {
            const tag = tags[i];
            await tx.runAsync(query, [athleteId, tag.id, i]);
          }
        });
      },
      {
        fnName: "saveTagOrderInDb",
        table: athleteTagOrder,
        query,
        data,
      },
    );
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
  async (
    tag: RawTag,
    athleteId: number,
  ): DbOpPromiseResult<SQLiteRunResult> => {
    const listOfCurrentTags = await getOrderedRawTagsFromDb(db)(athleteId);
    const tagExists = listOfCurrentTags.find(({ name }) => name === tag.name);

    if (tagExists && tagExists.id !== tag.id) {
      return {
        success: false,
        error: `'${tag.name}' tag already exists, choose different name`,
      };
    }

    const { routeTags } = tables;
    const query = `UPDATE ${routeTags} SET name = ?, color = ? WHERE id = ?;`;
    const data = [tag.name, tag.color, tag.id];

    const result = await runDbWithLogging(() => db.runAsync(query, data), {
      fnName: "updateTagInDb",
      table: routeTags,
      query,
      data,
    });

    return {
      success: true,
      data: result,
    };
  };

export const getOrderedRawTagsFromDb =
  (db: SQLiteDatabase) =>
  async (athleteId: number): Promise<RawTag[]> => {
    const { routeTags, athleteTagOrder } = tables;
    const query = `
      SELECT rt.id, rt.name, rt.color
      FROM ${routeTags} rt
      LEFT JOIN ${athleteTagOrder} ato ON rt.id = ato.tag_id AND ato.athlete_id = ?
      ORDER BY ato.order_position IS NULL, ato.order_position ASC, rt.id DESC;
    `;
    const data = [athleteId];

    const result = await runDbWithLogging(
      () => db.getAllAsync<RawTag>(query, data),
      {
        fnName: "getOrderedRawTagsFromDb",
        table: routeTags,
        query,
        data,
      },
    );

    return result;
  };

export const assignTagToRoute =
  (db: SQLiteDatabase) =>
  async (tagId: number, routeId: string): Promise<SQLiteRunResult> => {
    // TODO: should we also be saving athleteID in this table??
    const { routeTagAssignments } = tables;
    const query = `
      INSERT INTO ${routeTagAssignments} (route_id, tag_id) VALUES (?, ?) 
      ON CONFLICT(route_id, tag_id) DO NOTHING`;
    const data = [routeId, tagId];

    const result = await runDbWithLogging(() => db.runAsync(query, data), {
      fnName: "assignTagToRoute",
      table: routeTagAssignments,
      query,
      data,
    });

    return result;
  };

export const getAssignedTagsForRoute =
  (db: SQLiteDatabase) =>
  async (routeId: string): Promise<TagWithAssignment[]> => {
    const { routeTags, routeTagAssignments } = tables;
    const query = `
      SELECT rt.id, rt.name, rt.color, 
        CASE 
            WHEN rta.tag_id IS NOT NULL THEN 1 
            ELSE 0 
        END AS isAssigned
      FROM ${routeTags} rt
      LEFT JOIN ${routeTagAssignments} rta ON rt.id = rta.tag_id AND rta.route_id = ?
      ORDER BY rt.name;
    `;
    const data = [routeId];

    const result = await runDbWithLogging(
      () => db.getAllAsync<TagWithAssignment>(query, [routeId]),
      {
        fnName: "getAssignedTagsForRoute",
        table: routeTags,
        query,
        data,
      },
    );

    return result;
  };

export const removeTagFromRoute =
  (db: SQLiteDatabase) =>
  async (tagId: number, routeId: string): Promise<SQLiteRunResult> => {
    const { routeTagAssignments } = tables;
    const query = `DELETE FROM ${routeTagAssignments} WHERE tag_id = ? AND route_id = ?`;
    const data = [tagId, routeId];

    const result = await runDbWithLogging(() => db.runAsync(query, data), {
      fnName: "removeTagFromRoute",
      table: routeTagAssignments,
      query,
      data,
    });

    return result;
  };

export const getRouteIdsByTagId =
  (db: SQLiteDatabase) =>
  async (tagId: number): Promise<string[]> => {
    const { routeTagAssignments } = tables;
    const query = `SELECT route_id FROM ${routeTagAssignments} WHERE tag_id = ?`;
    // TODO: why tagId is a string here? Investigate across the App, should we be always casting to number when retrieving from the DB?
    const data = [Number(tagId)];

    const result = await runDbWithLogging(
      () => db.getAllAsync<{ route_id: string }>(query, data),
      {
        fnName: "getRouteIdsByTagId",
        table: routeTagAssignments,
        query,
        data,
      },
    );

    return result.map(({ route_id }) => route_id);
  };

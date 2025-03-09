import { log, logDb } from "@/library/logger";

export interface SQLiteError extends Error {
  code?: string; // Error code, e.g., "ERR_INTERNAL_SQLITE_ERROR"
  message: string; // Error message describing the issue
  stack?: string; // Stack trace for debugging
}

export const isSQLiteError = (error: unknown): error is SQLiteError => {
  return (
    isError(error) &&
    typeof error.message === "string" &&
    (!("code" in error) || typeof (error as any).code === "string")
  );
};

export const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

export const isSqlConstraintError = (error: SQLiteError) => {
  return error.message.includes("UNIQUE constraint failed:");
};

type DbCallContext = {
  table: string;
  query: string;
  fnName?: string;
  data?: object;
};

export const runDbWithLogging = async <T>(
  operation: () => Promise<T>,
  context: DbCallContext,
): Promise<T> => {
  try {
    const result = await operation();
    logDb.debug(context.table, context.query, {
      ...context.data,
      functionName: context.fnName,
      result,
    });

    // TODO: could we implement a check here to ensure that the result is not undefined
    //  but in some cases when we need it to be null/undefined we allow that?
    // if (!result) {
    //   throw new Error("No result from DB operation");
    // }

    return result;
  } catch (error) {
    const { query, table, ...rest } = context;
    if (isSQLiteError(error)) {
      logDb.error(table, error, query, rest);
    }

    if (isError(error)) {
      logDb.error(table, error, query, rest);
    }

    if (!isSQLiteError(error) || !isError(error)) {
      log.error("runDbWithLogging", "Error during DB process not recognised", {
        error,
        context,
      });
    }

    throw error;
  }
};

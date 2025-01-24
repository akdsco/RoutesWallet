interface SQLiteError extends Error {
  code?: string; // Error code, e.g., "ERR_INTERNAL_SQLITE_ERROR"
  message: string; // Error message describing the issue
  stack?: string; // Stack trace for debugging
}

export const isSQLiteError = (error: unknown): error is SQLiteError => {
  return (
    error instanceof Error &&
    typeof error.message === "string" &&
    (!("code" in error) || typeof (error as any).code === "string")
  );
};

export const isConstraintError = (error: SQLiteError) => {
  return error.message.includes("UNIQUE constraint failed:");
};

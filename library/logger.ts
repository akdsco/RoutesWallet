import { AppConfig } from "@/library/config";
import { postHog } from "@/library/analytics/posthog";
import { isError, isSQLiteError, SQLiteError } from "@/db/error";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogParams = {
  level: LogLevel;
  fnName: string;
  action: string;
  context?: object;
};

type LogDbParams = {
  level: LogLevel;
  tableName: string;
  query: string;
  error?: Error;
  context?: object;
};

const isDebugModeOn = AppConfig.DEBUG_MODE === "true";

export const log = {
  debug: (fnName: string, action: string, context?: object) =>
    isDebugModeOn ? logger({ level: "debug", fnName, action, context }) : {},
  info: (fnName: string, action: string, context?: object) => {
    logger({ level: "info", fnName, action, context });
    postHog.capture(action, { fnName, ...context }, { timestamp: new Date() });
  },
  warn: (fnName: string, action: string, context?: object) =>
    logger({ level: "warn", fnName, action, context }),
  error: (fnName: string, action: string, context?: object) =>
    logger({ level: "error", fnName, action, context }),
};

const logger = ({ level, fnName, action, context }: LogParams) => {
  const logMessage = `[${fnName}]: ${action}`;
  const ctx = getContext(context);

  logBasedOnType(level, logMessage, ctx);
};

export const logDb = {
  debug: (tableName: string, query: string, context?: object) =>
    isDebugModeOn
      ? loggerDb({ level: "debug", tableName, query, context })
      : {},
  info: (tableName: string, query: string, context?: object) =>
    loggerDb({ level: "info", tableName, query, context }),
  warn: (tableName: string, query: string, context?: object) =>
    loggerDb({ level: "warn", tableName, query, context }),
  error: (
    tableName: string,
    error: SQLiteError | Error,
    query: string,
    context?: object,
  ) => loggerDb({ level: "error", tableName, error, query, context }),
};

const loggerDb = ({ level, tableName, error, query, context }: LogDbParams) => {
  let message = `DB:${tableName}`;
  const flatQuery = query.replace(/\s+/g, " ").trim();

  if (isSQLiteError(error)) {
    message = `${message}:eMSG:${error.message}:eCODE:${error.code}`;
    return logBasedOnType(
      level,
      message,
      getContext({ ...context, eStack: error.stack }),
      flatQuery,
    );
  }

  if (isError(error)) {
    message = `${message}:eMSG:${error.message}:eSTACK:${error.stack}`;
    return logBasedOnType(level, message, getContext(context), flatQuery);
  }

  const logMessage = `DB:${tableName}`;
  const ctx = getContext(context);

  return logBasedOnType(level, logMessage, ctx, flatQuery);
};

const logBasedOnType = (
  type: LogLevel,
  logMessage: string,
  ctx: string,
  lessRelevantMsg?: string,
) => {
  const less = lessRelevantMsg ? lessRelevantMsg : "";
  switch (type) {
    case "info":
      console.info(logMessage, ctx, less);
      break;
    case "warn":
      console.warn(logMessage, ctx, less);
      break;
    case "error":
      console.error(logMessage, ctx, less);
      break;
    case "debug":
      console.debug(logMessage, ctx, less);
      break;
  }
};

const getContext = (context?: object) => {
  if (!context) {
    return "";
  }

  const replacer = (_key: string, value: any) => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === "number" ? `${item} (num)` : item,
      );
    }
    return value;
  };

  const stringifiedObject = JSON.stringify(context, replacer);

  return AppConfig.DEBUG_MODE_VERBOSE === "true"
    ? stringifiedObject
    : stringifiedObject.length > 250
      ? stringifiedObject.slice(0, 250) + "..."
      : stringifiedObject;
};

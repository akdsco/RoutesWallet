import { AppConfig } from "@/library/config";
import { postHog } from "@/library/analytics/posthog";

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
  context?: object;
};

const isDebugModeOn = AppConfig.DEBUG_MODE === "true";

export const log = {
  debug: (fnName: string, action: string, context?: object) =>
    isDebugModeOn ? logger({ level: "debug", fnName, action, context }) : {},
  info: (fnName: string, action: string, context?: object) => {
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
  error: (tableName: string, query: string, context?: object) =>
    loggerDb({ level: "error", tableName, query, context }),
};

const loggerDb = ({ level, tableName, query, context }: LogDbParams) => {
  const logMessage = `DB:TABLE:${tableName}:${query.replace(/\s+/g, " ").trim()}`;
  const ctx = getContext(context);

  return logBasedOnType(level, logMessage, ctx);
};

const logBasedOnType = (type: LogLevel, logMessage: string, ctx: string) => {
  switch (type) {
    case "info":
      console.info(logMessage, ctx);
      break;
    case "warn":
      console.warn(logMessage, ctx);
      break;
    case "error":
      console.error(logMessage, ctx);
      break;
    case "debug":
      console.debug(logMessage, ctx);
      break;
  }
};

const getContext = (context?: object) => {
  if (!context) {
    return "";
  }

  const stringifiedObject = JSON.stringify(context);

  return AppConfig.DEBUG_MODE_VERBOSE === "true"
    ? stringifiedObject
    : stringifiedObject.length > 250
      ? stringifiedObject.slice(0, 250) + "..."
      : stringifiedObject;
};

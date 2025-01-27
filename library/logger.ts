type LogLevel = "info" | "warn" | "error" | "debug";
type DBAction = "INSERT" | "UPDATE" | "DELETE";

type LogParams = {
  level: LogLevel;
  fnName: string;
  action: string;
  context?: object;
};

export const log = {
  debug: (fnName: string, action: string, context?: object) =>
    logger({ level: "debug", fnName, action, context }),
  info: (fnName: string, action: string, context?: object) =>
    logger({ level: "info", fnName, action, context }),
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

export const logDb = (
  type: LogLevel,
  tableName: string,
  action: DBAction,
  query: string,
  context?: object,
) => {
  const logMessage = `[${tableName}]:${action}:${query}`;
  const ctx = getContext(context);

  return logBasedOnType(type, logMessage, ctx);
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

  return `: ${JSON.stringify(context)}`;
};

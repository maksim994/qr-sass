type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  area: "api" | "ui" | "runtime";
  route?: string;
  message: string;
  requestId?: string;
  code?: string;
  status?: number;
  details?: unknown;
};

function write(level: LogLevel, payload: LogPayload) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
    return;
  }
  if (level === "warn") {
    console.warn(JSON.stringify(entry));
    return;
  }
  console.info(JSON.stringify(entry));
}

export const logger = {
  info(payload: LogPayload) {
    write("info", payload);
  },
  warn(payload: LogPayload) {
    write("warn", payload);
  },
  error(payload: LogPayload) {
    write("error", payload);
  },
};

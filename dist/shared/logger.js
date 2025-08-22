import pino from "pino";
const isDevelopment = process.env.NODE_ENV !== "production";
export const logger = pino({
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    transport: isDevelopment
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                singleLine: false,
            },
        }
        : undefined,
});
export function createChildLogger(bindingName) {
    return logger.child({ module: bindingName });
}
//# sourceMappingURL=logger.js.map
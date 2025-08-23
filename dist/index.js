import "dotenv/config";
// Re-export main server creation functions
export { createHttpServer } from "./routes/http.js";
export { createWsServer } from "./routes/ws.js";
// Re-export core modules
export { TestRunner } from "./modules/testRunner.js";
export { AIEvals, SimpleAIProvider, OpenAIProvider, GeminiProvider, ClaudeProvider, QwenProvider } from "./modules/aiEvals.js";
export { GitOps } from "./modules/git.js";
export { Formatter } from "./modules/formatter.js";
export { VisualRunner } from "./modules/visualRunner.js";
export { MergeResolver } from "./modules/mergeResolver.js";
export { SelfHealing } from "./modules/selfHealing.js";
export { Persistence } from "./modules/persistence.js";
export { RulesFileManager } from "./modules/rulesFile.js";
export { createPullRequest } from "./modules/pr.js";
// Re-export shared utilities and types
export { logger, createChildLogger } from "./shared/logger.js";
export { eventBus } from "./shared/events.js";
export { loadConfig } from "./shared/config.js";
// Server startup function for when used as a standalone application
export async function startServer(options) {
    const { resolve } = await import("node:path");
    const repoRoot = options?.repoRoot || resolve(process.cwd());
    const httpPort = options?.httpPort || Number(process.env.MCP_HTTP_PORT || 7040);
    const wsPort = options?.wsPort || Number(process.env.MCP_WS_PORT || 7041);
    const { createHttpServer } = await import("./routes/http.js");
    const { createWsServer } = await import("./routes/ws.js");
    const { logger } = await import("./shared/logger.js");
    const http = await createHttpServer(repoRoot);
    await http.listen({ port: httpPort, host: "0.0.0.0" });
    logger.info({ httpPort }, "HTTP server listening");
    await createWsServer(repoRoot, wsPort);
    logger.info({ wsPort }, "WS server listening");
    return {
        http,
        close: () => {
            http.close();
        }
    };
}
// Auto-start server only if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch((err) => {
        console.error("Fatal error starting MCP server:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map
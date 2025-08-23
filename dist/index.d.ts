import "dotenv/config";
export { createHttpServer } from "./routes/http.js";
export { createWsServer } from "./routes/ws.js";
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
export { logger, createChildLogger } from "./shared/logger.js";
export { eventBus } from "./shared/events.js";
export { loadConfig } from "./shared/config.js";
export type { AppConfig } from "./shared/config.js";
export type { TaskKind, TaskStatus, AiToolRulesFile, TestRunResult, FixSuggestion, AIEvalFindings } from "./shared/types.js";
export type { Logger } from "./shared/logger.js";
export type { AIProvider } from "./modules/aiEvals.js";
export { ConfigManager } from "./cli/config.js";
export { ChatInterface } from "./cli/chat.js";
export declare function startServer(options?: {
    repoRoot?: string;
    httpPort?: number;
    wsPort?: number;
}): Promise<{
    http: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>;
    close: () => void;
}>;
//# sourceMappingURL=index.d.ts.map
import "dotenv/config";
import { createHttpServer } from "./routes/http.js";
import { createWsServer } from "./routes/ws.js";
import { logger } from "./shared/logger.js";
import { resolve } from "node:path";

async function main() {
	const repoRoot = resolve(process.cwd());
	const httpPort = Number(process.env.MCP_HTTP_PORT || 7040);
	const wsPort = Number(process.env.MCP_WS_PORT || 7041);

	const http = await createHttpServer(repoRoot);
	await http.listen({ port: httpPort, host: "0.0.0.0" });
	logger.info({ httpPort }, "HTTP server listening");

	await createWsServer(repoRoot, wsPort);
	logger.info({ wsPort }, "WS server listening");
}

main().catch((err) => {
	logger.error({ err }, "Fatal error starting MCP server");
	process.exit(1);
});

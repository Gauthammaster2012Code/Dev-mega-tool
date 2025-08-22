import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import { createServer } from "http";
import { createChildLogger } from "../shared/logger.js";
import { RulesFileManager } from "../modules/rulesFile.js";

export async function createWsServer(repoRoot: string, port: number): Promise<{
close: () => void }> {

	const log = createChildLogger("ws");
	const rules = new RulesFileManager(repoRoot);
	await rules.ensureExists();

	const server = createServer();
	const wss = new WebSocketServer({ server });

	wss.on("connection", async (ws: WebSocket) => {
		log.info("WS client connected");
		ws.send(JSON.stringify({ type: "status", payload: await rules.read() }));

		ws.on("message", async (msg: RawData) => {
			try {
				const data = JSON.parse(msg.toString());
				if (data?.type === "ping") {
					ws.send(JSON.stringify({ type: "pong" }));

				}
			} catch {}
		});
	});

	server.listen(port);
	log.info({ port }, "WS server listening");

	const close = () => {
		for (const client of wss.clients) {
			client.close();
		}
		wss.close();
		server.close();
	};
	return { close };
}

import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { createChildLogger } from "../shared/logger.js";
import { RulesFileManager } from "../modules/rulesFile.js";
import { eventBus } from "../shared/events.js";
export async function createWsServer(repoRoot, port) {
    const log = createChildLogger("ws");
    const rules = new RulesFileManager(repoRoot);
    await rules.ensureExists();
    const server = createServer();
    const wss = new WebSocketServer({ server });
    function broadcast(json) {
        const text = JSON.stringify(json);
        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN)
                client.send(text);
        }
    }
    // Subscribe to global events
    eventBus.on("event", (evt) => {
        broadcast(evt);
    });
    wss.on("connection", async (ws) => {
        log.info("WS client connected");
        ws.send(JSON.stringify({ type: "status", payload: await rules.read() }));
        ws.on("message", async (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                if (data?.type === "ping") {
                    ws.send(JSON.stringify({ type: "pong" }));
                }
            }
            catch { }
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
//# sourceMappingURL=ws.js.map
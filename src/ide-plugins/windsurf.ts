import WebSocket from "ws";
import fetch from "node-fetch";

const HTTP = process.env.MCP_HTTP || "http://localhost:7040";
const WS = process.env.MCP_WS || "ws://localhost:7041";

export async function runWindsurfClient() {
	const ws = new WebSocket(WS);
	ws.on("message", (data) => {
		try { console.log("[MCP-WS]", JSON.parse(data.toString())); } catch { console.log("[MCP-WS]", data.toString()); }
	});
	await fetch(`${HTTP}/status`).then((r) => r.json()).then((j) => console.log("[MCP-HTTP] status", j));
}

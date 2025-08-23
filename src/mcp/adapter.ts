import { MDT_TOOLS } from "../tools/index.js";

export type MDTToolResult = { taskId?: string; ok: boolean; payload?: any; error?: string };

export async function callMDTTool(toolName: keyof typeof MDT_TOOLS, params: any): Promise<MDTToolResult> {
	const tool = (MDT_TOOLS as any)[toolName];
	if (!tool) return { ok: false, error: `Unknown tool: ${String(toolName)}` };
	try {
		const res = await tool(params);
		return { ok: res.ok, payload: res.payload, error: res.error ? JSON.stringify(res.error) : undefined };
	} catch (err: any) {
		return { ok: false, error: err?.message || String(err) };
	}
}
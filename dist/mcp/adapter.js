import { MDT_TOOLS } from "../tools/index.js";
export async function callMDTTool(toolName, params) {
    const tool = MDT_TOOLS[toolName];
    if (!tool)
        return { ok: false, error: `Unknown tool: ${String(toolName)}` };
    try {
        const res = await tool(params);
        return { ok: res.ok, payload: res.payload, error: res.error ? JSON.stringify(res.error) : undefined };
    }
    catch (err) {
        return { ok: false, error: err?.message || String(err) };
    }
}
//# sourceMappingURL=adapter.js.map
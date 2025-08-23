#!/usr/bin/env node
import "dotenv/config";
import { callMDTTool } from "../mcp/adapter.js";
function printHelp() {
    console.log(`MDT - Mega Dev Tool\n\nCommands:\n  interactive\n  run <tool> --json-params '{...}'\n  analyze\n  test [--with-ai]\n  visual --url <url> --name <name>\n  config --provider <name> --key <key> [--base <url>]\n`);
}
async function main() {
    const [, , cmd, ...rest] = process.argv;
    if (!cmd || cmd === "-h" || cmd === "--help") {
        printHelp();
        return;
    }
    if (cmd === "interactive") {
        console.log("Interactive mode is minimal. Use 'run <tool>' for now.");
        return;
    }
    if (cmd === "run") {
        const toolName = rest[0];
        const jsonIdx = rest.indexOf("--json-params");
        const json = jsonIdx >= 0 ? JSON.parse(rest[jsonIdx + 1] || "{}") : {};
        const out = await callMDTTool(toolName, json);
        console.log(JSON.stringify(out, null, 2));
        return;
    }
    if (cmd === "analyze") {
        const out = await callMDTTool("analyze_codebase", {});
        console.log(JSON.stringify(out, null, 2));
        return;
    }
    if (cmd === "test") {
        const withAi = rest.includes("--with-ai");
        const out = await callMDTTool(withAi ? "run_tests_with_ai_eval" : "run_tests", {});
        console.log(JSON.stringify(out, null, 2));
        return;
    }
    if (cmd === "visual") {
        const urlIdx = rest.indexOf("--url");
        const nameIdx = rest.indexOf("--name");
        const url = urlIdx >= 0 ? rest[urlIdx + 1] : "http://localhost:3000";
        const name = nameIdx >= 0 ? rest[nameIdx + 1] : "home";
        const out = await callMDTTool("run_visual_tests", { url, name });
        console.log(JSON.stringify(out, null, 2));
        return;
    }
    if (cmd === "config") {
        const provider = rest[rest.indexOf("--provider") + 1];
        const key = rest[rest.indexOf("--key") + 1];
        const base = rest.includes("--base") ? rest[rest.indexOf("--base") + 1] : undefined;
        const out = await callMDTTool("setup_config", { aiProvider: provider, apiKey: key, baseURL: base, testConnection: true });
        console.log(JSON.stringify(out, null, 2));
        return;
    }
    printHelp();
}
main().catch((err) => { console.error(err); process.exit(1); });
//# sourceMappingURL=mdt.js.map
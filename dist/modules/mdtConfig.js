import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, dirname } from "node:path";
import { createChildLogger } from "../shared/logger.js";
const CONFIG_NAME = ".mdt-config.json";
export async function loadMdtConfig(repoRoot) {
    const path = resolve(repoRoot, CONFIG_NAME);
    try {
        await access(path, constants.F_OK);
        const raw = await readFile(path, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return { aiProvider: null, apiKeys: {}, preferences: {}, privacy: { shareWithAI: "selected" }, verification: [] };
    }
}
export async function saveMdtConfig(repoRoot, cfg) {
    const path = resolve(repoRoot, CONFIG_NAME);
    await mkdir(dirname(path), { recursive: true }).catch(() => { });
    await writeFile(path, JSON.stringify(cfg, null, 2), "utf8");
}
function redact(key) {
    if (!key)
        return "";
    const last4 = key.slice(-4);
    return `****${last4}`;
}
export async function verifyApiKey(provider, apiKey, baseURL) {
    const log = createChildLogger("mdt-config");
    try {
        if (!apiKey || apiKey.length < 8) {
            return { ok: false, provider, reason: "Empty or too-short API key", remediation: "Provide a valid key via CLI or environment." };
        }
        if (provider === "openai") {
            const mod = await import("openai");
            const client = new mod.OpenAI({ apiKey, baseURL });
            await client.models.list({});
            return { ok: true, provider };
        }
        if (provider === "gemini") {
            const mod = await import("@google/generative-ai");
            const ai = new mod.GoogleGenerativeAI(apiKey);
            await ai.getGenerativeModel({ model: "gemini-1.5-flash" }).generateContent("ping");
            return { ok: true, provider };
        }
        if (provider === "claude") {
            const mod = await import("@anthropic-ai/sdk");
            const c = new mod.Anthropic({ apiKey, maxRetries: 0, timeout: 15000 });
            await c.messages.create({ model: "claude-3-5-sonnet-20240620", max_tokens: 1, messages: [{ role: "user", content: "ping" }] });
            return { ok: true, provider };
        }
        if (provider === "qwen") {
            const mod = await import("openai");
            const client = new mod.OpenAI({ apiKey, baseURL: baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1" });
            await client.models.list({});
            return { ok: true, provider };
        }
        return { ok: false, provider, reason: `Unknown provider: ${provider}`, remediation: "Use one of: openai, gemini, claude, qwen." };
    }
    catch (err) {
        log.warn({ provider, key: redact(apiKey), err: err?.message }, "API key verification failed");
        let remediation = "Check key validity, network connectivity, and provider status.";
        if (String(err?.message || "").toLowerCase().includes("unauthorized"))
            remediation = "Key unauthorized. Recreate key or ensure correct provider/baseURL.";
        return { ok: false, provider, reason: err?.message || "Verification failed", remediation };
    }
}
//# sourceMappingURL=mdtConfig.js.map
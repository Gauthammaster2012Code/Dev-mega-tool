import { readFile, writeFile, chmod } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { createChildLogger } from "../shared/logger.js";

const KEY_FILE = "MCP_KEY.md";

export async function generateKey(): Promise<string> {
	return randomBytes(32).toString("hex"); // 64 hex chars
}

export async function writeMcpKey(repoRoot: string, key: string): Promise<string> {
	const path = resolve(repoRoot, KEY_FILE);
	const content = `KEY="${key}"\n`;
	await writeFile(path, content, "utf8");
	// Make read-only for owner
	await chmod(path, 0o400).catch(() => {});
	return path;
}

export async function readMcpKey(repoRoot: string): Promise<string | null> {
	try {
		const path = resolve(repoRoot, KEY_FILE);
		const raw = await readFile(path, "utf8");
		const m = raw.match(/KEY\s*=\s*"([A-Fa-f0-9]{64})"/);
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

export async function ensureMcpKey(repoRoot: string): Promise<{ key: string; path: string }> {
	const log = createChildLogger("mcp-key");
	const key = await generateKey();
	const path = await writeMcpKey(repoRoot, key);
	log.info({ path }, "Wrote MCP key file");
	return { key, path };
}

export async function verifyMcpKey(repoRoot: string, provided: string | undefined | null): Promise<boolean> {
	if (!provided) return false;
	const fileKey = await readMcpKey(repoRoot);
	return !!fileKey && provided === fileKey;
}
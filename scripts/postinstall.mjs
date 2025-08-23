import { randomBytes } from 'node:crypto';
import { writeFile, chmod, access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

async function ensureKeyFile(repoRoot) {
	const path = resolve(repoRoot, 'MCP_KEY.md');
	try {
		await access(path, constants.F_OK);
		// If file exists and matches format, keep it
		const raw = await readFile(path, 'utf8').catch(() => '');
		if (/KEY\s*=\s*"[A-Fa-f0-9]{64}"/.test(raw)) return;
	} catch {}
	const key = randomBytes(32).toString('hex');
	const content = `KEY="${key}"\n`;
	await writeFile(path, content, 'utf8').catch(() => {});
	await chmod(path, 0o400).catch(() => {});
}

(async () => {
	try {
		await ensureKeyFile(process.cwd());
		// Do not print noisy output in CI
	} catch {
		// Never fail installation
	}
})();
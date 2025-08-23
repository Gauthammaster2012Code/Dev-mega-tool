import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ensureMcpKey } from '../src/modules/mcpKey.js';

async function main() {
	const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	await ensureMcpKey(repoRoot).catch(() => {});
}

main();
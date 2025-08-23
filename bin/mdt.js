#!/usr/bin/env node

import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const distCli = resolve(new URL('.', import.meta.url).pathname, '../dist/cli/mdt.js');
const srcCliTs = resolve(new URL('.', import.meta.url).pathname, '../src/cli/mdt.ts');

(async () => {
	if (existsSync(distCli)) {
		const mod = await import(distCli);
		return;
	}
	try {
		const p = spawn(process.execPath, [resolve(process.cwd(), 'node_modules/.bin/tsx'), srcCliTs, ...process.argv.slice(2)], { stdio: 'inherit' });
		p.on('exit', (code) => process.exit(code || 0));
	} catch (err) {
		console.error('[mdt] Failed to load compiled CLI and tsx is not available. Please run `npm run build` first.');
		console.error(err && err.stack ? err.stack : String(err));
		process.exit(1);
	}
})();
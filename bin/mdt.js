#!/usr/bin/env node

import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distCli = resolve(here, '../dist/cli/mdt.js');
const srcCliTs = resolve(here, '../src/cli/mdt.ts');

(async () => {
	if (existsSync(distCli)) {
		await import(distCli);
		return;
	}
	// Prefer a local tsx binary if present, otherwise try project-level, then fall back to npx tsx
	const binName = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
	const localTsx = resolve(here, '../node_modules/.bin', binName);
	// Parent project's .bin (e.g., <project>/node_modules/.bin)
	const parentTsx = resolve(here, '../../.bin', binName);
	const args = [srcCliTs, ...process.argv.slice(2)];
	try {
		let child;
		if (existsSync(localTsx)) {
			child = spawn(localTsx, args, { stdio: 'inherit' });
		} else if (existsSync(parentTsx)) {
			child = spawn(parentTsx, args, { stdio: 'inherit' });
		} else {
			const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
			child = spawn(npxCmd, ['--yes', 'tsx', ...args], { stdio: 'inherit' });
		}
		child.on('exit', (code) => process.exit(code || 0));
	} catch (err) {
		console.error('[mdt] Failed to load compiled CLI and could not invoke tsx. Please run `npm run build` first.');
		console.error(err && err.stack ? err.stack : String(err));
		process.exit(1);
	}
})();
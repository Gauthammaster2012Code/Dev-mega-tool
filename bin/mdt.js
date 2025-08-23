#!/usr/bin/env node

// Try to load compiled CLI, fallback to tsx/ts-node during development
const { resolve } = require('node:path');
const { existsSync } = require('node:fs');

const distCli = resolve(__dirname, '../dist/cli/mdt.js');
const srcCliTs = resolve(__dirname, '../src/cli/mdt.ts');

(async () => {
	if (existsSync(distCli)) {
		require(distCli);
		return;
	}
	try {
		// Attempt to run via tsx if available
		require('tsx/cli');
		process.argv.splice(2, 0, srcCliTs);
	} catch (err) {
		console.error('[mdt] Failed to load compiled CLI and tsx is not available. Please run `npm run build` first.');
		console.error(err && err.stack ? err.stack : String(err));
		process.exit(1);
	}
})();
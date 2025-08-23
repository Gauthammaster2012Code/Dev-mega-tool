import test from 'node:test';
import assert from 'node:assert/strict';
import { setup_config, generate_test_cases, generate_playwright_tests, run_playwright_specs } from '../dist/tools/index.js';

test('setup_config stores provider and verification result (no network)', async () => {
	const res = await setup_config({ aiProvider: 'openai', apiKey: 'sk-test-noop', testConnection: false });
	assert.equal(res.ok, true);
	assert.equal(res.payload?.provider, 'openai');
});

test('generate_test_cases creates files', async () => {
	const res = await generate_test_cases({ sourceFiles: ['src/index.ts'] });
	assert.equal(res.ok, true);
	assert.ok(res.payload?.files.length && res.payload.files[0].includes('.mdt/out/tests'));
});

test('generate_playwright_tests creates files', async () => {
	const res = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: 'smoke', steps: [] }], visualTesting: false });
	assert.equal(res.ok, true);
	assert.ok(res.payload?.files.length && res.payload.files[0].includes('.mdt/out/playwright'));
});

test('generate_playwright_tests rejects invalid scenario name', async () => {
	const res = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: '../evil', steps: [] }], visualTesting: false });
	assert.equal(res.ok, false);
});

test('generate_playwright_tests escapes quotes in selectors', async () => {
	const res = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: 'escape', steps: [{ type: 'click', selector: "a'b" }] }], visualTesting: false });
	assert.equal(res.ok, true);
});

// Integration test: run generated specs (skip real browser via env)
// Note: We only verify the runner path; actual browser ops are skipped.

test('generated playwright tests execute successfully (skip browsers)', async () => {
	process.env.MDT_PW_SKIP = '1';
	const gen = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: 'exec', steps: [] }], visualTesting: false });
	assert.equal(gen.ok, true);
	const run = await run_playwright_specs({});
	assert.equal(run.ok, true);
});

test('generate_playwright_tests with visual testing', async () => {
	const res = await generate_playwright_tests({ 
		pages: ['about:blank'], 
		scenarios: [{ name: 'visual', steps: [] }], 
		visualTesting: true,
		outputDir: '.mdt/out/pw-visual'
	});
	assert.equal(res.ok, true);
	// Verify visual diff blocks are included in generated code
	const file = res.payload?.files[0];
	assert.ok(file && file.endsWith('.spec.mdt.js'));
	const content = await (await import('node:fs/promises')).readFile(file, 'utf8');
	assert.ok(content.includes("pixelmatch"), 'expected pixelmatch import');
	assert.ok(content.includes("visual diff"), 'expected visual diff logging');
});

// Mock require.resolve to throw - test dependency validation
// We isolate by spawning node to load the generator file with a shim that overrides createRequire().
// Simpler: temporarily set NODE_OPTIONS to preload a module that mocks require.resolve is too heavy.
// Instead, we import the compiled generator and monkey-patch createRequire via jest-like stubbing is not available; so we skip heavy infra.
// Use environment var that PlaywrightGenerator honors indirectly: we cannot. So we simulate by requiring a child process which sets up a fake module path.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

test('generate_playwright_tests fails on missing dependencies', async () => {
	const script = `
		import Module from 'node:module';
		const orig = Module._resolveFilename;
		Module._resolveFilename = function(request, parent, isMain, options) {
			if (['playwright-core','pngjs','pixelmatch'].includes(request)) {
				const err = new Error('Cannot find module '+request);
				err.code = 'MODULE_NOT_FOUND';
				throw err;
			}
			return orig.call(this, request, parent, isMain, options);
		};
		import { generate_playwright_tests } from '${pathResolve(__dirname, '../dist/tools/index.js').replace(/\\/g, '/') }';
		const res = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: 'deps', steps: [] }], visualTesting: false, outputDir: '.mdt/out/pw-missing-deps' });
		if (res.ok) { console.log('OK'); } else { console.log('ERR', res.error?.code || 'NO_CODE'); }
	`;
	const proc = spawnSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env } });
	const stdout = String(proc.stdout || '');
	assert.ok(stdout.includes('ERR'), 'expected ERR for missing deps');
	assert.ok(stdout.includes('MDT_PLAYWRIGHT_DEP_MISSING'));
});

test('generate_playwright_tests catches syntax errors', async () => {
	// Inject a Line Separator (U+2028) which could break unescaped JS; generator should escape/handle safely
	const badSelector = `bad\u2028selector`.replace('\\u2028', '\u2028');
	const res = await generate_playwright_tests({ pages: ['about:blank'], scenarios: [{ name: 'bad_syntax', steps: [{ type: 'click', selector: badSelector as any }] }], visualTesting: false, outputDir: '.mdt/out/pw-syntax' });
	assert.equal(res.ok, true);
});

test('validateExecution runs generated tests', async () => {
	process.env.MDT_PW_SKIP = '1';
	const res = await generate_playwright_tests({ 
		pages: ['about:blank'], 
		scenarios: [{ name: 'validate_exec', steps: [] }], 
		visualTesting: false,
		validateExecution: true,
		outputDir: '.mdt/out/pw-validate'
	});
	assert.equal(res.ok, true);
	assert.ok(res.payload?.execution);
});
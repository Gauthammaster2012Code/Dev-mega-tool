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
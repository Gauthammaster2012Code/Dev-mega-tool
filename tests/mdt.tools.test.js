import test from 'node:test';
import assert from 'node:assert/strict';
import { setup_config, generate_test_cases } from '../dist/tools/index.js';
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
//# sourceMappingURL=mdt.tools.test.js.map
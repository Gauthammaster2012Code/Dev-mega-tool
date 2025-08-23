import { resolve } from "node:path";
import { GitOps } from "../modules/git.js";
import { VisualRunner } from "../modules/visualRunner.js";
import { TestRunner } from "../modules/testRunner.js";
import { AIEvals } from "../modules/aiEvals.js";
import { SelfHealing } from "../modules/selfHealing.js";
import { RulesFileManager } from "../modules/rulesFile.js";
import { Analyzer } from "../modules/analyzer.js";
import { PuppeteerGenerator } from "../modules/puppeteerGen.js";
import { loadMdtConfig, saveMdtConfig, verifyApiKey } from "../modules/mdtConfig.js";
import { readdir } from "node:fs/promises";
import { MdtRulesManager } from "../modules/mdtRules.js";
import { Persistence } from "../modules/persistence.js";
import { nanoid } from "nanoid";
// Git tools
export async function make_git_branch(params) {
    try {
        const git = new GitOps(process.cwd());
        await git.ensureRepo();
        const ctx = params.taskContext || "work";
        const branch = await git.createTempBranch(`${params.prefix || "mdt/"}${ctx}`);
        // Write MDT branch metadata
        await git.writeMdtStatus({ branch, taskContext: ctx });
        if (params.switchToBranch) {
            await git.switchBranch(branch, { createIfNotExists: false });
        }
        return { ok: true, payload: { branchName: branch } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
    }
}
export async function switch_branch(params) {
    try {
        const git = new GitOps(process.cwd());
        await git.ensureRepo();
        await git.switchBranch(params.name, { createIfNotExists: params.createIfNotExists === true, baseBranch: params.baseBranch });
        await git.writeMdtStatus({ branch: params.name });
        return { ok: true, payload: { branch: params.name } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
    }
}
export async function merge_mdt_branch(params) {
    try {
        const git = new GitOps(process.cwd());
        await git.ensureRepo();
        const res = await git.mergeBranch(params.source, params.target || (await git.currentBranch()), { squash: params.squashCommits === true, dryRun: !params.force });
        if (res.conflicts?.length)
            return { ok: false, error: { code: "MDT_GIT_CONFLICT", message: "Merge conflicts detected", suggestedAction: "Resolve conflicts or re-run with force" }, payload: { merged: false, conflicts: res.conflicts } };
        if (params.force) {
            await git.mergeBranch(params.source, params.target || (await git.currentBranch()), { squash: params.squashCommits === true, dryRun: false });
        }
        if (params.deleteAfterMerge)
            await git.deleteBranch(params.source);
        return { ok: true, payload: { merged: true } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
    }
}
export async function check_git_status() {
    try {
        const git = new GitOps(process.cwd());
        await git.ensureRepo();
        const s = await git.status();
        return { ok: true, payload: s };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
    }
}
// Analysis tools
export async function analyze_codebase() {
    try {
        const analyzer = new Analyzer(process.cwd());
        const index = await analyzer.analyze();
        return { ok: true, payload: index };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_ANALYZE", message: err?.message || String(err) } };
    }
}
export async function detect_test_framework() {
    try {
        const frameworks = [];
        const pkgDir = resolve(process.cwd());
        const files = await readdir(pkgDir).catch(() => []);
        if (files.includes("jest.config.js") || files.includes("jest.config.ts"))
            frameworks.push("jest");
        if (files.includes("mocha.opts"))
            frameworks.push("mocha");
        return { ok: true, payload: { frameworks } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_ANALYZE", message: err?.message || String(err) } };
    }
}
export async function find_test_patterns() {
    return { ok: true, payload: { patterns: ["setup/teardown detection TODO"] } };
}
// Test generation
export async function generate_test_cases() {
    return { ok: true, payload: { files: [] } };
}
export async function generate_puppeteer_tests(params) {
    try {
        const gen = new PuppeteerGenerator(process.cwd());
        const out = await gen.generate({ pages: params.pages, scenarios: params.scenarios, visualTesting: params.visualTesting });
        return { ok: true, payload: out };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GEN", message: err?.message || String(err) } };
    }
}
export async function generate_property_tests() {
    return { ok: true, payload: { files: [] } };
}
// Test execution
export async function run_tests() {
    try {
        const runner = new TestRunner();
        const results = await runner.runAll();
        const repoRoot = resolve(process.cwd());
        const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
        db.recordTestRun(nanoid(8), results, results.reports?.jest || null);
        return { ok: true, payload: results };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_TEST", message: err?.message || String(err) } };
    }
}
export async function run_tests_with_ai_eval(params) {
    try {
        const runner = new TestRunner();
        const results = await runner.runAll();
        const ai = AIEvals.fromEnv();
        const findings = await ai.evaluate(results);
        const repoRoot = resolve(process.cwd());
        const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
        db.recordTestRun(nanoid(8), results, results.reports?.jest || null);
        db.recordAIFindings(nanoid(8), findings);
        if (params?.autoApplyFixes && findings.suggestions.length) {
            const git = new GitOps(process.cwd());
            const healer = new SelfHealing(git);
            await healer.applySuggestions(await git.createTempBranch('ai-fixes'), findings.suggestions);
        }
        return { ok: true, payload: { results, findings } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_TEST_AI", message: err?.message || String(err) } };
    }
}
export async function run_visual_tests(params) {
    try {
        const vr = new VisualRunner(process.cwd());
        const out = await vr.runOnce(params.url, params.name);
        return { ok: true, payload: out };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_VISUAL", message: err?.message || String(err) } };
    }
}
// Fixing tools
export async function fix_test_failures(params) {
    try {
        const git = new GitOps(process.cwd());
        const healer = new SelfHealing(git);
        const res = await healer.applySuggestions(await git.createTempBranch('fix-tests'), params.suggestions);
        return { ok: true, payload: res };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_FIX", message: err?.message || String(err) } };
    }
}
export async function fix_code_issues() { return { ok: true, payload: {} }; }
export async function resolve_conflicts(params) {
    try {
        const git = new GitOps(process.cwd());
        const files = await git.listUnmergedFiles();
        if (files.length === 0)
            return { ok: true, payload: { resolved: true, files: [] } };
        if (params?.strategy && params.strategy !== "manual")
            await git.resolveConflicts(files, params.strategy);
        return { ok: true, payload: { resolved: params?.strategy !== 'manual', files } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_CONFLICT", message: err?.message || String(err) } };
    }
}
// Status tools
export async function get_task_status() {
    const rules = new RulesFileManager(process.cwd());
    return { ok: true, payload: await rules.read() };
}
export async function check_active_tasks() {
    const rules = new RulesFileManager(process.cwd());
    const r = await rules.read();
    return { ok: true, payload: { task: r.task } };
}
export async function get_completed_work() {
    const repoRoot = resolve(process.cwd());
    const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
    return { ok: true, payload: { failures: db.getRecentFailures(), fixes: db.getFixHistory() } };
}
export async function check_rules() {
    const mgr = new MdtRulesManager(process.cwd());
    await mgr.ensureExists();
    const rules = await mgr.read();
    return { ok: true, payload: rules };
}
// Config
export async function setup_config(params) {
    try {
        const repoRoot = resolve(process.cwd());
        const cfg = await loadMdtConfig(repoRoot);
        cfg.aiProvider = params.aiProvider;
        cfg.apiKeys = { ...(cfg.apiKeys || {}), [params.aiProvider]: params.apiKey };
        let result = { ok: true, provider: params.aiProvider };
        if (params.testConnection !== false) {
            result = await verifyApiKey(params.aiProvider, params.apiKey, params.baseURL);
        }
        cfg.verification = [...(cfg.verification || []).filter(v => v.provider !== params.aiProvider), { provider: params.aiProvider, ok: result.ok, reason: result.reason, verifiedAt: new Date().toISOString() }];
        await saveMdtConfig(repoRoot, cfg);
        return { ok: true, payload: result };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_CONFIG", message: err?.message || String(err) } };
    }
}
export async function init_project() { return { ok: true, payload: {} }; }
export async function update_rules() { return { ok: true, payload: {} }; }
// IDE integration
export async function connect_cursor() { return { ok: true, payload: {} }; }
export async function connect_windsurf() { return { ok: true, payload: {} }; }
export async function sync_ide_context() { return { ok: true, payload: {} }; }
// Cleanup
export async function cleanup_branches() {
    try {
        const git = new GitOps(process.cwd());
        await git.ensureRepo();
        // simple-git does not provide last-commit time listing; this is a stub for demonstration
        return { ok: true, payload: { cleaned: 0 } };
    }
    catch (err) {
        return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
    }
}
export async function cleanup_status() { return { ok: true, payload: {} }; }
export const MDT_TOOLS = {
    // Git tools
    make_git_branch,
    switch_branch,
    merge_mdt_branch,
    check_git_status,
    // Analysis tools
    analyze_codebase,
    detect_test_framework,
    find_test_patterns,
    // Test generation
    generate_test_cases,
    generate_puppeteer_tests,
    generate_property_tests,
    // Test execution
    run_tests,
    run_tests_with_ai_eval,
    run_visual_tests,
    // Fixing tools
    fix_test_failures,
    fix_code_issues,
    resolve_conflicts,
    // Status tools
    get_task_status,
    check_active_tasks,
    get_completed_work,
    check_rules,
    // Configuration
    setup_config,
    init_project,
    update_rules,
    // IDE integration
    connect_cursor,
    connect_windsurf,
    sync_ide_context,
    // Cleanup
    cleanup_branches,
    cleanup_status
};
//# sourceMappingURL=index.js.map
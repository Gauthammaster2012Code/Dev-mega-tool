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
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { MdtRulesManager } from "../modules/mdtRules.js";
import { Persistence } from "../modules/persistence.js";
import { nanoid } from "nanoid";
import { verifyMcpKey } from "../modules/mcpKey.js";
import { spawn } from "node:child_process";
import { generateNodeTests } from "../modules/testGen.js";
import { PlaywrightGenerator } from "../modules/playwrightGen.js";

export type ToolResult<T = any> = { ok: boolean; payload?: T; error?: { code: string; message: string; retryable?: boolean; suggestedAction?: string } };

// Git tools
export async function make_git_branch(params: { prefix?: string; taskContext?: string; switchToBranch?: boolean; stashChanges?: boolean }): Promise<ToolResult<{ branchName: string }>> {
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
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
	}
}

export async function switch_branch(params: { name: string; createIfNotExists?: boolean; baseBranch?: string; stashChanges?: boolean }): Promise<ToolResult<{ branch: string }>> {
	try {
		const git = new GitOps(process.cwd());
		await git.ensureRepo();
		await git.switchBranch(params.name, { createIfNotExists: params.createIfNotExists === true, baseBranch: params.baseBranch });
		await git.writeMdtStatus({ branch: params.name });
		return { ok: true, payload: { branch: params.name } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
	}
}

export async function merge_mdt_branch(params: { source: string; target?: string; squashCommits?: boolean; deleteAfterMerge?: boolean; force?: boolean }): Promise<ToolResult<{ merged: boolean; conflicts?: string[] }>> {
	try {
		const git = new GitOps(process.cwd());
		await git.ensureRepo();
		const res = await git.mergeBranch(params.source, params.target || (await git.currentBranch()), { squash: params.squashCommits === true, dryRun: !params.force });
		if ((res as any).conflicts?.length) return { ok: false, error: { code: "MDT_GIT_CONFLICT", message: "Merge conflicts detected", suggestedAction: "Resolve conflicts or re-run with force" }, payload: { merged: false, conflicts: (res as any).conflicts } } as any;
		if (params.force) {
			await git.mergeBranch(params.source, params.target || (await git.currentBranch()), { squash: params.squashCommits === true, dryRun: false });
		}
		if (params.deleteAfterMerge) await git.deleteBranch(params.source);
		return { ok: true, payload: { merged: true } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
	}
}

export async function check_git_status(): Promise<ToolResult<{ branch: string; uncommittedFiles: string[]; aheadBehind: { ahead: number; behind: number } }>> {
	try {
		const git = new GitOps(process.cwd());
		await git.ensureRepo();
		const s = await git.status();
		return { ok: true, payload: s } as any;
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
	}
}

// Analysis tools
export async function analyze_codebase(): Promise<ToolResult> {
	try {
		const analyzer = new Analyzer(process.cwd());
		const index = await analyzer.analyze();
		return { ok: true, payload: index };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_ANALYZE", message: err?.message || String(err) } };
	}
}

export async function detect_test_framework(): Promise<ToolResult<{ frameworks: string[] }>> {
	try {
		const frameworks: string[] = [];
		const pkgDir = resolve(process.cwd());
		const files = await readdir(pkgDir).catch(() => [] as any);
		if (files.includes("jest.config.js") || files.includes("jest.config.ts")) frameworks.push("jest");
		if (files.includes("mocha.opts")) frameworks.push("mocha");
		return { ok: true, payload: { frameworks } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_ANALYZE", message: err?.message || String(err) } };
	}
}

export async function find_test_patterns(): Promise<ToolResult<{ patterns: string[] }>> {
	return { ok: true, payload: { patterns: ["setup/teardown detection TODO"] } };
}

// Test generation
export async function generate_test_cases(params?: { sourceFiles?: string[]; outDir?: string }): Promise<ToolResult<{ files: string[] }>> {
	try {
		const repoRoot = resolve(process.cwd());
		const srcs = params?.sourceFiles && params.sourceFiles.length ? params.sourceFiles : ["src/index.ts"];
		const out = await generateNodeTests(repoRoot, srcs, params?.outDir || ".mdt/out/tests");
		return { ok: true, payload: out };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GEN", message: err?.message || String(err) } };
	}
}

export async function generate_puppeteer_tests(params: { pages: string[]; scenarios: Array<{ name: string; steps: any[] }>; visualTesting?: boolean }): Promise<ToolResult<{ files: string[] }>> {
	try {
		const gen = new PuppeteerGenerator(process.cwd());
		const out = await gen.generate({ pages: params.pages, scenarios: params.scenarios, visualTesting: params.visualTesting });
		return { ok: true, payload: out };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GEN", message: err?.message || String(err) } };
	}
}

export async function generate_playwright_tests(params: { pages: string[]; scenarios: Array<{ name: string; steps: Array<{ type: "click"|"fill"|"waitFor"; selector?: string; value?: string; waitFor?: string }> }>; visualTesting?: boolean; outputDir?: string; validateExecution?: boolean }): Promise<ToolResult<{ files: string[]; execution?: any }>> {
	try {
		const gen = new PlaywrightGenerator(process.cwd());
		const out = await gen.generate({ pages: params.pages, scenarios: params.scenarios as any, visualTesting: params.visualTesting, outputDir: params.outputDir });
		let execution = undefined as any;
		if (params.validateExecution) {
			execution = await run_playwright_specs({ glob: (params.outputDir || '.mdt/out/playwright') + '/**/*.js', timeoutMs: 30_000 });
		}
		return { ok: true, payload: { ...out, execution } };
	} catch (err: any) {
		const code = err?.code || 'MDT_GEN';
		return { ok: false, error: { code, message: err?.message || String(err) } };
	}
}

export async function generate_property_tests(): Promise<ToolResult<{ files: string[] }>> {
	return { ok: true, payload: { files: [] } };
}

// Test execution
export async function run_tests(): Promise<ToolResult> {
	try {
		const runner = new TestRunner();
		let results = await runner.runAll();
		if (!results || (results.passed + results.failed + results.skipped === 0)) {
			// Fallback to Node test runner
			results = await new Promise((resolveRun) => {
				const p = spawn(process.execPath, ["--test"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, CI: "true" } });
				let stdout = "";
				p.stdout.on("data", (d) => (stdout += d.toString()));
				p.on("close", () => resolveRun({ passed: 0, failed: 0, skipped: 0, reports: {}, raw: { stdout }, durationMs: 0 }));
			});
		}
		const repoRoot = resolve(process.cwd());
		const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
		db.recordTestRun(nanoid(8), results, (results as any).reports?.jest || null);
		return { ok: true, payload: results };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_TEST", message: err?.message || String(err) } };
	}
}

export async function run_playwright_specs(params?: { glob?: string; timeoutMs?: number }): Promise<ToolResult<{ passed: number; failed: number; skipped: number; reports: any; raw: any }>> {
	try {
		const glob = params?.glob || ".mdt/out/playwright/**/*.js";
		return await new Promise((resolveRun) => {
			const mocha = spawn("npx", ["--yes", "mocha", "--reporter", "json", glob], { stdio: ["ignore", "pipe", "pipe"] });
			let stdout = "";
			let killed = false;
			const timer = setTimeout(() => { if (!killed) { killed = true; try { mocha.kill("SIGKILL"); } catch {} } }, Math.max(10_000, Math.min(300_000, params?.timeoutMs || 60_000)));
			mocha.stdout.on("data", (d) => (stdout += d.toString()));
			mocha.on("error", (err) => { clearTimeout(timer); resolveRun({ ok: false, error: { code: "MDT_PLAYWRIGHT", message: err?.message || String(err) } } as any); });
			mocha.on("close", () => {
				clearTimeout(timer);
				if (killed) return resolveRun({ ok: false, error: { code: "MDT_PLAYWRIGHT_TIMEOUT", message: "Playwright specs timed out" } } as any);
				try {
					const json = JSON.parse(stdout || "{}");
					const payload = { passed: Number(json.stats?.passes ?? 0), failed: Number(json.stats?.failures ?? 0), skipped: Number(json.stats?.pending ?? 0), reports: { mocha: true }, raw: json };
					resolveRun({ ok: true, payload } as any);
				} catch (e: any) {
					resolveRun({ ok: false, error: { code: "MDT_PLAYWRIGHT_PARSE", message: e?.message || String(e) } } as any);
				}
			});
		});
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_PLAYWRIGHT", message: err?.message || String(err) } } as any;
	}
}

export async function run_tests_with_ai_eval(params?: { autoApplyFixes?: boolean }): Promise<ToolResult> {
	try {
		const runner = new TestRunner();
		const results = await runner.runAll();
		const ai = AIEvals.fromEnv();
		const findings = await ai.evaluate(results);
		const repoRoot = resolve(process.cwd());
		const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
		db.recordTestRun(nanoid(8), results, (results as any).reports?.jest || null);
		db.recordAIFindings(nanoid(8), findings);
		if (params?.autoApplyFixes && findings.suggestions.length) {
			const git = new GitOps(process.cwd());
			const healer = new SelfHealing(git);
			await healer.applySuggestions(await git.createTempBranch('ai-fixes'), findings.suggestions);
		}
		return { ok: true, payload: { results, findings } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_TEST_AI", message: err?.message || String(err) } };
	}
}

export async function run_visual_tests(params: { url: string; name: string }): Promise<ToolResult> {
	try {
		const vr = new VisualRunner(process.cwd());
		const out = await vr.runOnce(params.url, params.name);
		return { ok: true, payload: out };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_VISUAL", message: err?.message || String(err) } };
	}
}

// Fixing tools
export async function fix_test_failures(params: { suggestions: Array<{ filePath: string; newContent?: string; patch?: string; description?: string }> }): Promise<ToolResult> {
	try {
		const git = new GitOps(process.cwd());
		const healer = new SelfHealing(git);
		const res = await healer.applySuggestions(await git.createTempBranch('fix-tests'), params.suggestions as any);
		return { ok: true, payload: res };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_FIX", message: err?.message || String(err) } };
	}
}

export async function fix_code_issues(): Promise<ToolResult> { return { ok: true, payload: {} }; }

export async function resolve_conflicts(params?: { strategy?: "ours" | "theirs" | "manual" }): Promise<ToolResult> {
	try {
		const git = new GitOps(process.cwd());
		const files = await git.listUnmergedFiles();
		if (files.length === 0) return { ok: true, payload: { resolved: true, files: [] } } as any;
		if (params?.strategy && params.strategy !== "manual") await git.resolveConflicts(files, params.strategy);
		return { ok: true, payload: { resolved: params?.strategy !== 'manual', files } } as any;
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_CONFLICT", message: err?.message || String(err) } };
	}
}

// Key verification (no auth required)
export async function key_verify(params: { key?: string }): Promise<ToolResult<{ valid: boolean }>> {
	try {
		const valid = await verifyMcpKey(process.cwd(), params?.key || null);
		return { ok: true, payload: { valid } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_KEY", message: err?.message || String(err) } };
	}
}

// Status tools
export async function get_task_status(): Promise<ToolResult> {
	const rules = new RulesFileManager(process.cwd());
	return { ok: true, payload: await rules.read() };
}
export async function check_active_tasks(): Promise<ToolResult> {
	const rules = new RulesFileManager(process.cwd());
	const r = await rules.read();
	return { ok: true, payload: { task: r.task } } as any;
}
export async function get_completed_work(): Promise<ToolResult> {
	const repoRoot = resolve(process.cwd());
	const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
	return { ok: true, payload: { failures: db.getRecentFailures(), fixes: db.getFixHistory() } };
}
export async function check_rules(): Promise<ToolResult> {
	const mgr = new MdtRulesManager(process.cwd());
	await mgr.ensureExists();
	const rules = await mgr.read();
	return { ok: true, payload: rules };
}

// Config
export async function setup_config(params: { aiProvider: string; apiKey: string; baseURL?: string; projectSpecific?: boolean; testConnection?: boolean }): Promise<ToolResult<{ provider: string; ok: boolean; reason?: string; remediation?: string }>> {
	try {
		const repoRoot = resolve(process.cwd());
		const cfg = await loadMdtConfig(repoRoot);
		cfg.aiProvider = params.aiProvider;
		cfg.apiKeys = { ...(cfg.apiKeys || {}), [params.aiProvider]: params.apiKey };
		let result = { ok: true, provider: params.aiProvider } as { ok: boolean; provider: string; reason?: string; remediation?: string };
		if (params.testConnection !== false) {
			result = await verifyApiKey(params.aiProvider, params.apiKey, params.baseURL);
		}
		cfg.verification = [...(cfg.verification || []).filter(v => v.provider !== params.aiProvider), { provider: params.aiProvider, ok: result.ok, reason: result.reason, verifiedAt: new Date().toISOString() }];
		await saveMdtConfig(repoRoot, cfg);
		return { ok: true, payload: result };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_CONFIG", message: err?.message || String(err) } };
	}
}

export async function init_project(): Promise<ToolResult> {
	try {
		const repoRoot = resolve(process.cwd());
		await mkdir(resolve(repoRoot, ".mdt"), { recursive: true });
		const example = {
			aiProvider: "openai",
			defaultTestFramework: "jest",
			branchPrefix: "mdt/",
			autoFixPolicy: "conservative",
			privacy: { shareWithAI: false },
		};
		await writeFile(resolve(repoRoot, ".mdt/config.json"), JSON.stringify(example, null, 2), "utf8");
		return { ok: true, payload: { created: [".mdt/config.json"] } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_CONFIG", message: err?.message || String(err) } };
	}
}
export async function update_rules(): Promise<ToolResult> { return { ok: true, payload: {} }; }

// IDE integration
export async function connect_cursor(): Promise<ToolResult> { return { ok: true, payload: {} }; }
export async function connect_windsurf(): Promise<ToolResult> { return { ok: true, payload: {} }; }
export async function sync_ide_context(): Promise<ToolResult> { return { ok: true, payload: {} }; }

// Cleanup
export async function cleanup_branches(): Promise<ToolResult> {
	try {
		const git = new GitOps(process.cwd());
		await git.ensureRepo();
		// simple-git does not provide last-commit time listing; this is a stub for demonstration
		return { ok: true, payload: { cleaned: 0 } };
	} catch (err: any) {
		return { ok: false, error: { code: "MDT_GIT", message: err?.message || String(err) } };
	}
}
export async function cleanup_status(): Promise<ToolResult> { return { ok: true, payload: {} }; }

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
	generate_playwright_tests,
	generate_property_tests,
	
	// Test execution
	run_tests,
	run_playwright_specs,
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
	cleanup_status,

	// Key
	key_verify
};
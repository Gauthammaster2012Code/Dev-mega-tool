import "dotenv/config";
import { resolve } from "node:path";
import { nanoid } from "nanoid";
import { GitOps } from "../modules/git.js";
import { TestRunner } from "../modules/testRunner.js";
import { AIEvals } from "../modules/aiEvals.js";
import { SelfHealing } from "../modules/selfHealing.js";
import { VisualRunner } from "../modules/visualRunner.js";
import { RulesFileManager } from "../modules/rulesFile.js";
import { Persistence } from "../modules/persistence.js";
import { logger } from "../shared/logger.js";

async function orchestrate() {
	const repoRoot = resolve(process.cwd());
	const git = new GitOps(repoRoot);
	await git.ensureRepo();
	const rules = new RulesFileManager(repoRoot);
	await rules.ensureExists();
	const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));

	await rules.setTask("run-tests", "running");
	const testBranch = await git.createTempBranch("orchestrate-tests");
	const runner = new TestRunner();
	const results = await runner.runAll();
	db.recordTestRun(nanoid(8), results, results.reports?.jest || null);
	await rules.update({
		currentBranch: testBranch,
		testResults: {
			passed: results.passed,
			failed: results.failed,
			skipped: results.skipped,
			reportPath: results.reports?.jest ?? null,
			lastRunAt: new Date().toISOString(),
		},
		task: { id: null, type: "run-tests", status: "complete", updatedAt: new Date().toISOString() },
	});

	const ai = AIEvals.fromEnv();
	const findings = await ai.evaluate(results);
	db.recordAIFindings(nanoid(8), findings);
	await rules.update({ aiFix: { status: "pending", summary: `Severity: ${findings.severity}`, lastAppliedAt: undefined } });

	if (findings.suggestions.length > 0) {
		const fixBranch = await git.createTempBranch("orchestrate-fixes");
		const healer = new SelfHealing(git);
		const res = await healer.applySuggestions(fixBranch, findings.suggestions);
		await rules.update({ currentBranch: fixBranch, aiFix: { status: "complete", summary: `Applied: ${res.applied}`, lastAppliedAt: new Date().toISOString() } });
	}

	// Visual pass (optional)
	if (process.env.ORCH_VISUAL_URL) {
		const visual = new VisualRunner(repoRoot);
		const vr = await visual.runOnce(process.env.ORCH_VISUAL_URL, "orchestrate");
		db.recordVisualResult(nanoid(8), {
			url: vr.url,
			diffPixels: vr.diffPixels,
			width: vr.width,
			height: vr.height,
			baselinePath: vr.baselinePath,
			outputPath: vr.outputPath,
			diffPath: vr.diffPath,
		});
	}

	// Re-run tests
	const rerun = await runner.runAll();
	db.recordTestRun(nanoid(8), rerun, rerun.reports?.jest || null);
	logger.info({ initialFailed: results.failed, finalFailed: rerun.failed }, "Orchestrate complete");
}

orchestrate().catch((err) => {
	logger.error({ err }, "Orchestrate failed");
	process.exit(1);
});
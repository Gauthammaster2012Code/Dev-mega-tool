import Fastify from "fastify";
import { createChildLogger } from "../shared/logger.js";
import { RulesFileManager } from "../modules/rulesFile.js";
import { TestRunner } from "../modules/testRunner.js";
import { AIEvals } from "../modules/aiEvals.js";
import { GitOps } from "../modules/git.js";
import { Formatter } from "../modules/formatter.js";
import { VisualRunner } from "../modules/visualRunner.js";
import { MergeResolver } from "../modules/mergeResolver.js";
import { eventBus } from "../shared/events.js";
import { SelfHealing } from "../modules/selfHealing.js";
import { Persistence } from "../modules/persistence.js";
import { resolve } from "node:path";
import { nanoid } from "nanoid";
export async function createHttpServer(repoRoot) {
    const log = createChildLogger("http");
    const fastify = Fastify({ logger: false });
    const rules = new RulesFileManager(repoRoot);
    await rules.ensureExists();
    const git = new GitOps(repoRoot);
    await git.ensureRepo();
    const db = new Persistence(resolve(repoRoot, ".ai-tool.db"));
    fastify.get("/health", async () => ({ ok: true }));
    fastify.get("/status", async () => {
        return rules.read();
    });
    fastify.post("/run-tests", async () => {
        await rules.setTask("run-tests", "running");
        const branch = await git.createTempBranch("tests");
        const runner = new TestRunner();
        const results = await runner.runAll();
        eventBus.publish({ type: "test-results", payload: results });
        db.recordTestRun(nanoid(8), results, results.reports?.jest || null);
        await rules.update({
            currentBranch: branch,
            testResults: {
                passed: results.passed,
                failed: results.failed,
                skipped: results.skipped,
                reportPath: results.reports?.jest ?? null,
                lastRunAt: new Date().toISOString(),
            },
            task: { id: null, type: "run-tests", status: "complete", updatedAt: new Date().toISOString() },
        });
        return results;
    });
    fastify.post("/analyze", async () => {
        const runner = new TestRunner();
        const results = await runner.runAll();
        const ai = AIEvals.fromEnv();
        const findings = await ai.evaluate(results);
        eventBus.publish({ type: "ai-findings", payload: findings });
        db.recordAIFindings(nanoid(8), findings);
        await rules.update({
            testResults: {
                passed: results.passed,
                failed: results.failed,
                skipped: results.skipped,
                reportPath: results.reports?.jest ?? null,
                lastRunAt: new Date().toISOString(),
            },
            aiFix: { status: "pending", summary: `Severity: ${findings.severity}`, lastAppliedAt: undefined },
        });
        return findings;
    });
    fastify.post("/apply-fixes", async (req) => {
        const body = req.body || {};
        const { suggestions = [] } = body;
        const branch = await git.createTempBranch("fixes");
        const healer = new SelfHealing(git);
        const res = await healer.applySuggestions(branch, suggestions);
        eventBus.publish({ type: "fix-applied", payload: res });
        await rules.update({
            currentBranch: branch,
            aiFix: { status: "complete", summary: `Applied: ${res.applied}, Skipped: ${res.skipped}`, lastAppliedAt: new Date().toISOString() },
        });
        return res;
    });
    fastify.post("/format", async () => {
        const fmt = new Formatter();
        const out = await fmt.run();
        return out;
    });
    fastify.post("/visual", async (req, reply) => {
        const body = req.body || {};
        const { url = "http://localhost:3000", name = "home" } = body;
        const visual = new VisualRunner(repoRoot);
        const res = await visual.runOnce(url, name);
        db.recordVisualResult(nanoid(8), {
            url: res.url,
            diffPixels: res.diffPixels,
            width: res.width,
            height: res.height,
            baselinePath: res.baselinePath,
            outputPath: res.outputPath,
            diffPath: res.diffPath,
        });
        eventBus.publish({ type: "visual-results", payload: res });
        return res;
    });
    fastify.post("/fix-conflicts", async () => {
        const merge = new MergeResolver(git);
        const plan = await merge.resolveWithAI();
        return plan;
    });
    fastify.post("/orchestrate", async () => {
        await rules.setTask("run-tests", "running");
        const branch = await git.createTempBranch("orchestrate");
        const runner = new TestRunner();
        const results = await runner.runAll();
        db.recordTestRun(nanoid(8), results, results.reports?.jest || null);
        const ai = AIEvals.fromEnv();
        const findings = await ai.evaluate(results);
        db.recordAIFindings(nanoid(8), findings);
        const healer = new SelfHealing(git);
        const applied = await healer.applySuggestions(branch, findings.suggestions || []);
        const rerun = await runner.runAll();
        db.recordTestRun(nanoid(8), rerun, rerun.reports?.jest || null);
        await rules.update({
            currentBranch: branch,
            testResults: {
                passed: rerun.passed,
                failed: rerun.failed,
                skipped: rerun.skipped,
                reportPath: rerun.reports?.jest ?? null,
                lastRunAt: new Date().toISOString(),
            },
            task: { id: null, type: "run-tests", status: "complete", updatedAt: new Date().toISOString() },
            aiFix: { status: "complete", summary: `Applied: ${applied.applied}`, lastAppliedAt: new Date().toISOString() },
        });
        return { initial: results, findings, applied, final: rerun };
    });
    return fastify;
}
//# sourceMappingURL=http.js.map
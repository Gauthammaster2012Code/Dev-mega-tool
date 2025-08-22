import Fastify from "fastify";
import { createChildLogger } from "../shared/logger.js";
import { RulesFileManager } from "../modules/rulesFile.js";
import { TestRunner } from "../modules/testRunner.js";
import { AIEvals } from "../modules/aiEvals.js";
import { GitOps } from "../modules/git.js";
export async function createHttpServer(repoRoot) {
    const log = createChildLogger("http");
    const fastify = Fastify({ logger: false });
    const rules = new RulesFileManager(repoRoot);
    await rules.ensureExists();
    const git = new GitOps(repoRoot);
    await git.ensureRepo();
    fastify.get("/health", async () => ({ ok: true }));
    fastify.get("/status", async () => {
        return rules.read();
    });
    fastify.post("/run-tests", async () => {
        await rules.setTask("run-tests", "running");
        const branch = await git.createTempBranch("tests");
        const runner = new TestRunner();
        const results = await runner.runAll();
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
        const state = await rules.read();
        const runner = new TestRunner();
        const results = await runner.runAll();
        const ai = new AIEvals();
        const findings = await ai.evaluate(results);
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
    fastify.post("/fix-conflicts", async () => {
        // TODO: implement merge conflict detection and AI-assisted resolution
        return { ok: true, message: "Not implemented yet" };
    });
    fastify.post("/format", async () => {
        // TODO: call Prettier/ESLint, for now stub
        return { ok: true, message: "Formatting applied (stub)" };
    });
    return fastify;
}
//# sourceMappingURL=http.js.map
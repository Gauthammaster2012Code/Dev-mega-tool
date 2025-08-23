import { spawn } from "node:child_process";
import { createChildLogger } from "../shared/logger.js";
export class TestRunner {
    log = createChildLogger("test-runner");
    async runAll() {
        const start = Date.now();
        let aggregated = await this.tryJest();
        if (!aggregated)
            aggregated = await this.tryMocha();
        const result = aggregated ?? { passed: 0, failed: 0, skipped: 0, reports: {}, raw: {} };
        return { ...result, durationMs: Date.now() - start };
    }
    tryJest() {
        return new Promise((resolve) => {
            const jest = spawn("npx", ["--yes", "jest", "--json", "--outputFile=.jest-report.json"], {
                env: { ...process.env, CI: "true" },
                stdio: ["ignore", "pipe", "pipe"],
            });
            let stdout = "";
            let killed = false;
            const timer = setTimeout(() => { if (!killed) {
                killed = true;
                try {
                    jest.kill("SIGKILL");
                }
                catch { }
            } }, 60_000);
            jest.stdout.on("data", (d) => (stdout += d.toString()));
            jest.on("error", () => { clearTimeout(timer); resolve(null); });
            jest.on("close", () => {
                clearTimeout(timer);
                if (killed)
                    return resolve(null);
                try {
                    const json = JSON.parse(stdout || "{}");
                    resolve({
                        passed: Number(json.numPassedTests ?? 0),
                        failed: Number(json.numFailedTests ?? 0),
                        skipped: Number(json.numPendingTests ?? 0),
                        reports: { jest: ".jest-report.json" },
                        raw: json,
                    });
                }
                catch {
                    resolve(null);
                }
            });
        });
    }
    tryMocha() {
        return new Promise((resolve) => {
            const mocha = spawn("npx", ["--yes", "mocha", "--reporter", "json"], {
                stdio: ["ignore", "pipe", "pipe"],
            });
            let stdout = "";
            let killed = false;
            const timer = setTimeout(() => { if (!killed) {
                killed = true;
                try {
                    mocha.kill("SIGKILL");
                }
                catch { }
            } }, 60_000);
            mocha.stdout.on("data", (d) => (stdout += d.toString()));
            mocha.on("error", () => { clearTimeout(timer); resolve(null); });
            mocha.on("close", () => {
                clearTimeout(timer);
                if (killed)
                    return resolve(null);
                try {
                    const json = JSON.parse(stdout || "{}");
                    resolve({
                        passed: Number(json.stats?.passes ?? 0),
                        failed: Number(json.stats?.failures ?? 0),
                        skipped: Number(json.stats?.pending ?? 0),
                        reports: { jest: null },
                        raw: json,
                    });
                }
                catch {
                    resolve(null);
                }
            });
        });
    }
}
//# sourceMappingURL=testRunner.js.map
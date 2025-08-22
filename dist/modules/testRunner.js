import { spawn } from "node:child_process";
import { createChildLogger } from "../shared/logger.js";
export class TestRunner {
    log = createChildLogger("test-runner");
    async runAll() {
        const start = Date.now();
        const result = await this.runJest();
        return { ...result, durationMs: Date.now() - start };
    }
    runJest() {
        return new Promise((resolve) => {
            const jest = spawn("npx", ["--yes", "jest", "--json", "--outputFile=.jest-report.json"], {
                env: { ...process.env, CI: "true" },
                stdio: ["ignore", "pipe", "pipe"],
            });
            let stdout = "";
            let stderr = "";
            jest.stdout.on("data", (d) => (stdout += d.toString()));
            jest.stderr.on("data", (d) => (stderr += d.toString()));
            jest.on("close", () => {
                try {
                    const json = JSON.parse(stdout || "{}");
                    const passed = Number(json.numPassedTests ?? 0);
                    const failed = Number(json.numFailedTests ?? 0);
                    const skipped = Number(json.numPendingTests ?? 0);
                    resolve({ passed, failed, skipped, reports: { jest: ".jest-report.json" }, raw: json });
                }
                catch (err) {
                    this.log.warn({ err, stderr }, "Failed to parse Jest output, returning zeroed results");
                    resolve({ passed: 0, failed: 0, skipped: 0, reports: { jest: null }, raw: { stdout, stderr } });
                }
            });
        });
    }
}
//# sourceMappingURL=testRunner.js.map
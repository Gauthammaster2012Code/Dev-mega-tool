import { createChildLogger } from "../shared/logger.js";
export class SimpleAIProvider {
    name = "simple-local";
    async analyze({ testResults }) {
        const patterns = [];
        if (testResults.failed > 0 && testResults.passed === 0) {
            patterns.push("All tests failing: possible environment or config issue");
        }
        if (testResults.skipped > 0) {
            patterns.push("Skipped tests present: evaluate test stability and flakiness");
        }
        const severity = testResults.failed > 0 ? (testResults.failed > testResults.passed ? "high" : "medium") : "low";
        return {
            rootCauses: [],
            patterns,
            severity,
            suggestions: [],
        };
    }
}
export class AIEvals {
    provider;
    log = createChildLogger("ai-evals");
    constructor(provider = new SimpleAIProvider()) {
        this.provider = provider;
    }
    async evaluate(testResults) {
        this.log.debug({ provider: this.provider.name }, "Analyzing test results");
        const findings = await this.provider.analyze({ testResults });
        return findings;
    }
}
//# sourceMappingURL=aiEvals.js.map
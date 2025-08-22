import { createChildLogger } from "../shared/logger.js";
import type { AIEvalFindings, TestRunResult } from "../shared/types.js";

export interface AIProvider {
	name: string;
	analyze(input: { testResults: TestRunResult }): Promise<AIEvalFindings>;
}

export class SimpleAIProvider implements AIProvider {
	name = "simple-local";
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const patterns: string[] = [];
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
	private readonly log = createChildLogger("ai-evals");
	constructor(private readonly provider: AIProvider = new SimpleAIProvider()) {}

	async evaluate(testResults: TestRunResult): Promise<AIEvalFindings> {
		this.log.debug({ provider: this.provider.name }, "Analyzing test results");
		const findings = await this.provider.analyze({ testResults });
		return findings;
	}
}

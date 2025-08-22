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
export class OpenAIProvider {
    name = "openai";
    client;
    constructor(apiKey) {
        // Lazy import to avoid hard dep at build time
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OpenAI } = require("openai");
        this.client = new OpenAI({ apiKey });
    }
    async analyze({ testResults }) {
        const prompt = `You are an expert AI analyzing test results. Summarize root causes, patterns, severity (low|medium|high), and return JSON with keys: rootCauses (array of strings), patterns (array), severity (one of low, medium, high), suggestions (array of {filePath, description, severity}). Tests summary: ${JSON.stringify(testResults)}`;
        try {
            const res = await this.client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Return only minified JSON without code fences." },
                    { role: "user", content: prompt },
                ],
                response_format: { type: "json_object" },
            });
            const text = res.choices?.[0]?.message?.content || "{}";
            const json = JSON.parse(text);
            return {
                rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
                patterns: Array.isArray(json.patterns) ? json.patterns : [],
                severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
                suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
            };
        }
        catch (err) {
            const simple = new SimpleAIProvider();
            return simple.analyze({ testResults });
        }
    }
}
export class AIEvals {
    provider;
    log = createChildLogger("ai-evals");
    constructor(provider) {
        this.provider = provider;
    }
    static fromEnv() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey)
            return new AIEvals(new OpenAIProvider(apiKey));
        return new AIEvals(new SimpleAIProvider());
    }
    async evaluate(testResults) {
        this.log.debug({ provider: this.provider.name }, "Analyzing test results");
        const findings = await this.provider.analyze({ testResults });
        return findings;
    }
}
//# sourceMappingURL=aiEvals.js.map
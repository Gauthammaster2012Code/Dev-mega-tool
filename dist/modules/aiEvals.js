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
    clientPromise;
    constructor(apiKey, baseURL, model = "gpt-4o-mini") {
        this.clientPromise = import("openai").then((m) => new m.OpenAI({ apiKey, baseURL }));
        this.model = model;
    }
    model;
    async analyze({ testResults }) {
        const client = await this.clientPromise;
        const prompt = `You are an expert AI analyzing test results. Summarize root causes, patterns, severity (low|medium|high), and return JSON with keys: rootCauses (array of strings), patterns (array), severity (one of low, medium, high), suggestions (array of {filePath, description, severity}). Tests summary: ${JSON.stringify(testResults)}`;
        try {
            const res = await client.chat.completions.create({
                model: this.model,
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
        catch {
            const simple = new SimpleAIProvider();
            return simple.analyze({ testResults });
        }
    }
}
export class GeminiProvider {
    name = "gemini";
    clientPromise;
    constructor(apiKey, model = "gemini-1.5-flash") {
        this.clientPromise = import("@google/generative-ai").then((m) => new m.GoogleGenerativeAI(apiKey).getGenerativeModel({ model }));
    }
    async analyze({ testResults }) {
        const model = await this.clientPromise;
        const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(testResults)}`;
        try {
            const res = await model.generateContent(prompt);
            const text = res?.response?.text?.() || "{}";
            const json = JSON.parse(text);
            return {
                rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
                patterns: Array.isArray(json.patterns) ? json.patterns : [],
                severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
                suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
            };
        }
        catch {
            const simple = new SimpleAIProvider();
            return simple.analyze({ testResults });
        }
    }
}
export class ClaudeProvider {
    name = "claude";
    clientPromise;
    constructor(apiKey, model = "claude-3-5-sonnet-20240620") {
        this.clientPromise = import("@anthropic-ai/sdk").then((m) => new m.Anthropic({ apiKey, maxRetries: 1, timeout: 60_000, dangerouslyAllowBrowser: false, baseURL: process.env.ANTHROPIC_BASE_URL }));
        this.model = model;
    }
    model;
    async analyze({ testResults }) {
        const client = await this.clientPromise;
        const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(testResults)}`;
        try {
            const res = await client.messages.create({
                model: this.model,
                max_tokens: 800,
                messages: [
                    { role: "user", content: prompt },
                ],
            });
            const msg = res?.content?.[0];
            const text = (msg && msg.type === "text" && msg.text) || res?.content?.[0]?.text || "{}";
            const json = JSON.parse(text);
            return {
                rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
                patterns: Array.isArray(json.patterns) ? json.patterns : [],
                severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
                suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
            };
        }
        catch {
            const simple = new SimpleAIProvider();
            return simple.analyze({ testResults });
        }
    }
}
export class QwenProvider {
    name = "qwen";
    clientPromise;
    constructor(apiKey, model = "qwen2.5", baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1") {
        this.clientPromise = import("openai").then((m) => new m.OpenAI({ apiKey, baseURL }));
        this.model = model;
    }
    model;
    async analyze({ testResults }) {
        const client = await this.clientPromise;
        const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(testResults)}`;
        try {
            const res = await client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: "system", content: "Return only minified JSON without code fences." },
                    { role: "user", content: prompt },
                ],
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
        catch {
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
        const prefer = (process.env.AI_PROVIDER || "").toLowerCase();
        const openaiKey = process.env.OPENAI_API_KEY || null;
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
        const anthropicKey = process.env.ANTHROPIC_API_KEY || null;
        const qwenKey = process.env.DASHSCOPE_API_KEY || null;
        if (prefer === "claude" && anthropicKey)
            return new AIEvals(new ClaudeProvider(anthropicKey));
        if (prefer === "gemini" && geminiKey)
            return new AIEvals(new GeminiProvider(geminiKey));
        if (prefer === "qwen" && qwenKey)
            return new AIEvals(new QwenProvider(qwenKey));
        if (prefer === "openai" && openaiKey)
            return new AIEvals(new OpenAIProvider(openaiKey));
        if (anthropicKey)
            return new AIEvals(new ClaudeProvider(anthropicKey));
        if (openaiKey)
            return new AIEvals(new OpenAIProvider(openaiKey));
        if (qwenKey)
            return new AIEvals(new QwenProvider(qwenKey));
        if (geminiKey)
            return new AIEvals(new GeminiProvider(geminiKey));
        return new AIEvals(new SimpleAIProvider());
    }
    async evaluate(testResults) {
        this.log.debug({ provider: this.provider.name }, "Analyzing test results");
        const findings = await this.provider.analyze({ testResults });
        return findings;
    }
}
//# sourceMappingURL=aiEvals.js.map
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

export class OpenAIProvider implements AIProvider {
	name = "openai";
	private readonly clientPromise: Promise<any>;
	constructor(apiKey: string, baseURL?: string, model = "gpt-4o") {
		this.clientPromise = import("openai").then((m: any) => new m.OpenAI({ apiKey, baseURL }));
		this.model = model;
	}
	private readonly model: string;
	
	static readonly MODELS = {
		"gpt-4o": "GPT-4o (Latest)",
		"gpt-4o-mini": "GPT-4o Mini",
		"gpt-4-turbo": "GPT-4 Turbo",
		"gpt-4": "GPT-4",
		"gpt-3.5-turbo": "GPT-3.5 Turbo",
		// Future models (when available)
		"gpt-5": "GPT-5",
		"gpt-5-turbo": "GPT-5 Turbo"
	} as const;
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const client = await this.clientPromise;
		const prompt = `You are an expert AI analyzing test results. Summarize root causes, patterns, severity (low|medium|high), and return JSON with keys: rootCauses (array of strings), patterns (array), severity (one of low, medium, high), suggestions (array of {filePath, description, severity}). Tests summary: ${JSON.stringify(
			testResults
		)}`;
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
		} catch {
			const simple = new SimpleAIProvider();
			return simple.analyze({ testResults });
		}
	}
}

export class GeminiProvider implements AIProvider {
	name = "gemini";
	private readonly clientPromise: Promise<any>;
	constructor(apiKey: string, model = "gemini-2.0-flash-exp") {
		this.clientPromise = import("@google/generative-ai").then((m: any) => new m.GoogleGenerativeAI(apiKey).getGenerativeModel({ model }));
		this.model = model;
	}
	private readonly model: string;
	
	static readonly MODELS = {
		"gemini-2.0-flash-exp": "Gemini 2.0 Flash (Experimental)",
		"gemini-1.5-pro": "Gemini 1.5 Pro",
		"gemini-1.5-flash": "Gemini 1.5 Flash",
		"gemini-1.5-flash-8b": "Gemini 1.5 Flash 8B",
		// Future models (when available)
		"gemini-2.5-flash": "Gemini 2.5 Flash",
		"gemini-2.5-pro": "Gemini 2.5 Pro"
	} as const;
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const model = await this.clientPromise;
		const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(
			testResults
		)}`;
		try {
			const res = await model.generateContent(prompt);
			const text: string = res?.response?.text?.() || "{}";
			const json = JSON.parse(text);
			return {
				rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
				patterns: Array.isArray(json.patterns) ? json.patterns : [],
				severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
				suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
			};
		} catch {
			const simple = new SimpleAIProvider();
			return simple.analyze({ testResults });
		}
	}
}

export class ClaudeProvider implements AIProvider {
	name = "claude";
	private readonly clientPromise: Promise<any>;
	constructor(apiKey: string, model = "claude-3-5-sonnet-20241022") {
		this.clientPromise = import("@anthropic-ai/sdk").then((m: any) => new m.Anthropic({ apiKey, maxRetries: 1, timeout: 60_000, dangerouslyAllowBrowser: false, baseURL: process.env.ANTHROPIC_BASE_URL }));
		this.model = model;
	}
	private readonly model: string;
	
	static readonly MODELS = {
		"claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet (Latest)",
		"claude-3-5-sonnet-20240620": "Claude 3.5 Sonnet (June)",
		"claude-3-5-haiku-20241022": "Claude 3.5 Haiku",
		"claude-3-opus-20240229": "Claude 3 Opus",
		"claude-3-sonnet-20240229": "Claude 3 Sonnet",
		"claude-3-haiku-20240307": "Claude 3 Haiku",
		// Future models (when available)
		"claude-4-sonnet": "Claude 4 Sonnet",
		"claude-4-opus": "Claude 4 Opus",
		"claude-4.1-opus": "Claude 4.1 Opus"
	} as const;
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const client = await this.clientPromise;
		const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(
			testResults
		)}`;
		try {
			const res = await client.messages.create({
				model: this.model,
				max_tokens: 800,
				messages: [
					{ role: "user", content: prompt },
				],
			});
			const msg = res?.content?.[0];
			const text = (msg && msg.type === "text" && (msg as any).text) || (res?.content?.[0] as any)?.text || "{}";
			const json = JSON.parse(text);
			return {
				rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
				patterns: Array.isArray(json.patterns) ? json.patterns : [],
				severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
				suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
			};
		} catch {
			const simple = new SimpleAIProvider();
			return simple.analyze({ testResults });
		}
	}
}

export class QwenProvider implements AIProvider {
	name = "qwen";
	private readonly clientPromise: Promise<any>;
	constructor(apiKey: string, model = "qwen2.5-coder-32b-instruct", baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1") {
		this.clientPromise = import("openai").then((m: any) => new m.OpenAI({ apiKey, baseURL }));
		this.model = model;
	}
	private readonly model: string;
	
	static readonly MODELS = {
		"qwen2.5-coder-32b-instruct": "Qwen2.5-Coder 32B (Latest)",
		"qwen2.5-72b-instruct": "Qwen2.5 72B Instruct",
		"qwen2.5-32b-instruct": "Qwen2.5 32B Instruct",
		"qwen2.5-14b-instruct": "Qwen2.5 14B Instruct",
		"qwen2.5-7b-instruct": "Qwen2.5 7B Instruct",
		"qwen2.5-coder-7b-instruct": "Qwen2.5-Coder 7B",
		"qwen2.5": "Qwen2.5 (Legacy)",
		// Future models (when available)
		"qwen3-coder": "Qwen3 Coder",
		"qwen3-instruct": "Qwen3 Instruct"
	} as const;
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const client = await this.clientPromise;
		const prompt = `Return JSON keys: rootCauses, patterns, severity(low|medium|high), suggestions[{filePath, description, severity}]. Tests: ${JSON.stringify(
			testResults
		)}`;
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
		} catch {
			const simple = new SimpleAIProvider();
			return simple.analyze({ testResults });
		}
	}
}

export class DeepSeekProvider implements AIProvider {
	name = "deepseek";
	private readonly clientPromise: Promise<any>;
	constructor(apiKey: string, model = "deepseek-coder", baseURL = "https://api.deepseek.com/v1") {
		this.clientPromise = import("openai").then((m: any) => new m.OpenAI({ apiKey, baseURL }));
		this.model = model;
	}
	private readonly model: string;
	
	static readonly MODELS = {
		"deepseek-coder": "DeepSeek Coder (Latest)",
		"deepseek-chat": "DeepSeek Chat",
		"deepseek-reasoner": "DeepSeek Reasoner",
		// Future models (when available)
		"deepseek-v3": "DeepSeek V3",
		"deepseek-coder-v2": "DeepSeek Coder V2"
	} as const;
	
	async analyze({ testResults }: { testResults: TestRunResult }): Promise<AIEvalFindings> {
		const client = await this.clientPromise;
		const prompt = `You are an expert AI analyzing test results. Return JSON with keys: rootCauses (array of strings), patterns (array), severity (low|medium|high), suggestions (array of {filePath, description, severity}). Tests: ${JSON.stringify(testResults)}`;
		
		try {
			const res = await client.chat.completions.create({
				model: this.model,
				messages: [
					{ role: "system", content: "You are a code analysis expert. Return only valid JSON without code fences." },
					{ role: "user", content: prompt },
				],
				response_format: { type: "json_object" },
				temperature: 0.1,
			});
			
			const text = res.choices?.[0]?.message?.content || "{}";
			const json = JSON.parse(text);
			return {
				rootCauses: Array.isArray(json.rootCauses) ? json.rootCauses : [],
				patterns: Array.isArray(json.patterns) ? json.patterns : [],
				severity: json.severity === "high" || json.severity === "medium" ? json.severity : "low",
				suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
			};
		} catch (error) {
			const simple = new SimpleAIProvider();
			return simple.analyze({ testResults });
		}
	}
}

export class AIEvals {
	private readonly log = createChildLogger("ai-evals");
	constructor(private readonly provider: AIProvider) {}

	static fromEnv(): AIEvals {
		const prefer = (process.env.AI_PROVIDER || "").toLowerCase();
		const openaiKey = process.env.OPENAI_API_KEY || null;
		const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
		const anthropicKey = process.env.ANTHROPIC_API_KEY || null;
		const qwenKey = process.env.DASHSCOPE_API_KEY || null;

		if (prefer === "claude" && anthropicKey) return new AIEvals(new ClaudeProvider(anthropicKey));
		if (prefer === "gemini" && geminiKey) return new AIEvals(new GeminiProvider(geminiKey));
		if (prefer === "qwen" && qwenKey) return new AIEvals(new QwenProvider(qwenKey));
		if (prefer === "openai" && openaiKey) return new AIEvals(new OpenAIProvider(openaiKey));

		if (anthropicKey) return new AIEvals(new ClaudeProvider(anthropicKey));
		if (openaiKey) return new AIEvals(new OpenAIProvider(openaiKey));
		if (qwenKey) return new AIEvals(new QwenProvider(qwenKey));
		if (geminiKey) return new AIEvals(new GeminiProvider(geminiKey));
		return new AIEvals(new SimpleAIProvider());
	}

	async evaluate(testResults: TestRunResult): Promise<AIEvalFindings> {
		this.log.debug({ provider: this.provider.name }, "Analyzing test results");
		const findings = await this.provider.analyze({ testResults });
		return findings;
	}
}

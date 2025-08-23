import type { AIEvalFindings, TestRunResult } from "../shared/types.js";
export interface AIProvider {
    name: string;
    analyze(input: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class SimpleAIProvider implements AIProvider {
    name: string;
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class OpenAIProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, baseURL?: string, model?: string);
    private readonly model;
    static readonly MODELS: {
        readonly "gpt-4o": "GPT-4o (Latest)";
        readonly "gpt-4o-mini": "GPT-4o Mini";
        readonly "gpt-4-turbo": "GPT-4 Turbo";
        readonly "gpt-4": "GPT-4";
        readonly "gpt-3.5-turbo": "GPT-3.5 Turbo";
        readonly "gpt-5": "GPT-5";
        readonly "gpt-5-turbo": "GPT-5 Turbo";
    };
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class GeminiProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string);
    private readonly model;
    static readonly MODELS: {
        readonly "gemini-2.0-flash-exp": "Gemini 2.0 Flash (Experimental)";
        readonly "gemini-1.5-pro": "Gemini 1.5 Pro";
        readonly "gemini-1.5-flash": "Gemini 1.5 Flash";
        readonly "gemini-1.5-flash-8b": "Gemini 1.5 Flash 8B";
        readonly "gemini-2.5-flash": "Gemini 2.5 Flash";
        readonly "gemini-2.5-pro": "Gemini 2.5 Pro";
    };
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class ClaudeProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string);
    private readonly model;
    static readonly MODELS: {
        readonly "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet (Latest)";
        readonly "claude-3-5-sonnet-20240620": "Claude 3.5 Sonnet (June)";
        readonly "claude-3-5-haiku-20241022": "Claude 3.5 Haiku";
        readonly "claude-3-opus-20240229": "Claude 3 Opus";
        readonly "claude-3-sonnet-20240229": "Claude 3 Sonnet";
        readonly "claude-3-haiku-20240307": "Claude 3 Haiku";
        readonly "claude-4-sonnet": "Claude 4 Sonnet";
        readonly "claude-4-opus": "Claude 4 Opus";
        readonly "claude-4.1-opus": "Claude 4.1 Opus";
    };
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class QwenProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string, baseURL?: string);
    private readonly model;
    static readonly MODELS: {
        readonly "qwen2.5-coder-32b-instruct": "Qwen2.5-Coder 32B (Latest)";
        readonly "qwen2.5-72b-instruct": "Qwen2.5 72B Instruct";
        readonly "qwen2.5-32b-instruct": "Qwen2.5 32B Instruct";
        readonly "qwen2.5-14b-instruct": "Qwen2.5 14B Instruct";
        readonly "qwen2.5-7b-instruct": "Qwen2.5 7B Instruct";
        readonly "qwen2.5-coder-7b-instruct": "Qwen2.5-Coder 7B";
        readonly "qwen2.5": "Qwen2.5 (Legacy)";
        readonly "qwen3-coder": "Qwen3 Coder";
        readonly "qwen3-instruct": "Qwen3 Instruct";
    };
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class DeepSeekProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string, baseURL?: string);
    private readonly model;
    static readonly MODELS: {
        readonly "deepseek-coder": "DeepSeek Coder (Latest)";
        readonly "deepseek-chat": "DeepSeek Chat";
        readonly "deepseek-reasoner": "DeepSeek Reasoner";
        readonly "deepseek-v3": "DeepSeek V3";
        readonly "deepseek-coder-v2": "DeepSeek Coder V2";
    };
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class AIEvals {
    private readonly provider;
    private readonly log;
    constructor(provider: AIProvider);
    static fromEnv(): AIEvals;
    evaluate(testResults: TestRunResult): Promise<AIEvalFindings>;
}
//# sourceMappingURL=aiEvals.d.ts.map
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
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class GeminiProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string);
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class ClaudeProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string);
    private readonly model;
    analyze({ testResults }: {
        testResults: TestRunResult;
    }): Promise<AIEvalFindings>;
}
export declare class QwenProvider implements AIProvider {
    name: string;
    private readonly clientPromise;
    constructor(apiKey: string, model?: string, baseURL?: string);
    private readonly model;
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
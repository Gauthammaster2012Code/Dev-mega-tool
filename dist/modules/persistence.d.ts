import type { TestRunResult, AIEvalFindings } from "../shared/types.js";
export declare class Persistence {
    private readonly db;
    private readonly log;
    constructor(dbFilePath: string);
    private initialize;
    recordTestRun(id: string, result: TestRunResult, reportPath: string | null): void;
    recordFix(id: string, branch: string, description: string, success: boolean): void;
    recordMergeConflict(id: string, files: string[], resolution: string | null, success: boolean): void;
    recordAIFindings(id: string, findings: AIEvalFindings): void;
    recordVisualResult(id: string, args: {
        url: string;
        diffPixels: number;
        width: number;
        height: number;
        baselinePath: string;
        outputPath: string;
        diffPath: string;
    }): void;
    getRecentFailures(limit?: number): Array<{
        id: string;
        failed: number;
        created_at: string;
    }>;
    getFixHistory(limit?: number): Array<{
        id: string;
        branch: string;
        success: number;
        created_at: string;
    }>;
}
//# sourceMappingURL=persistence.d.ts.map
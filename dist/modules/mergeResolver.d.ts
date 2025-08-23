import { GitOps } from "./git.js";
export interface MergeConflictPlan {
    files: string[];
    strategy: "ours" | "theirs" | "manual";
    applied: boolean;
}
export declare class MergeResolver {
    private readonly git;
    private readonly log;
    constructor(git: GitOps);
    detectConflicts(): Promise<string[]>;
    resolveWithAI(strategy?: "ours" | "theirs" | "manual"): Promise<MergeConflictPlan>;
}
//# sourceMappingURL=mergeResolver.d.ts.map
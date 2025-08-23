type ConflictStrategy = "ours" | "theirs";
export declare class GitOps {
    private readonly repoPath;
    private readonly git;
    private readonly log;
    constructor(repoPath: string);
    ensureRepo(): Promise<void>;
    currentBranch(): Promise<string>;
    createTempBranch(prefix: string): Promise<string>;
    commitAll(message: string): Promise<void>;
    hasUnmergedFiles(): Promise<boolean>;
    listUnmergedFiles(): Promise<string[]>;
    resolveConflicts(files: string[], strategy: ConflictStrategy): Promise<void>;
}
export {};
//# sourceMappingURL=git.d.ts.map
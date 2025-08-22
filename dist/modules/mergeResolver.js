import { createChildLogger } from "../shared/logger.js";
export class MergeResolver {
    git;
    log = createChildLogger("merge-resolver");
    constructor(git) {
        this.git = git;
    }
    async detectConflicts() {
        const has = await this.git.hasUnmergedFiles();
        if (!has)
            return [];
        return this.git.listUnmergedFiles();
    }
    async resolveWithAI(strategy = "manual") {
        const files = await this.detectConflicts();
        if (files.length === 0)
            return { files, strategy: "manual", applied: false };
        if (strategy === "manual") {
            this.log.warn({ files }, "Conflicts detected; manual resolution required");
            return { files, strategy, applied: false };
        }
        await this.git.resolveConflicts(files, strategy);
        return { files, strategy, applied: true };
    }
}
//# sourceMappingURL=mergeResolver.js.map
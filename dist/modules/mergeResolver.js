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
        // Use git to list conflicted files
        return [];
    }
    async resolveWithAI() {
        const files = await this.detectConflicts();
        if (files.length === 0)
            return { files, strategy: "manual", applied: false };
        // Placeholder: choose manual for now
        this.log.warn({ files }, "Conflicts detected; AI resolution not implemented");
        return { files, strategy: "manual", applied: false };
    }
}
//# sourceMappingURL=mergeResolver.js.map
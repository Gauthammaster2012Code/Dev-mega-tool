import { createChildLogger } from "../shared/logger.js";
import { GitOps } from "./git.js";

export interface MergeConflictPlan {
	files: string[];
	strategy: "ours" | "theirs" | "manual";
	applied: boolean;
}

export class MergeResolver {
	private readonly log = createChildLogger("merge-resolver");
	constructor(private readonly git: GitOps) {}

	async detectConflicts(): Promise<string[]> {
		const has = await this.git.hasUnmergedFiles();
		if (!has) return [];
		return this.git.listUnmergedFiles();
	}

	async resolveWithAI(strategy: "ours" | "theirs" | "manual" = "manual"): Promise<MergeConflictPlan> {
		const files = await this.detectConflicts();
		if (files.length === 0) return { files, strategy: "manual", applied: false };
		if (strategy === "manual") {
			this.log.warn({ files }, "Conflicts detected; manual resolution required");
			return { files, strategy, applied: false };
		}
		await this.git.resolveConflicts(files, strategy);
		return { files, strategy, applied: true };
	}
}
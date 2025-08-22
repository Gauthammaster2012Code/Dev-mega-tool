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
		// Use git to list conflicted files
		return [];
	}

	async resolveWithAI(): Promise<MergeConflictPlan> {
		const files = await this.detectConflicts();
		if (files.length === 0) return { files, strategy: "manual", applied: false };
		// Placeholder: choose manual for now
		this.log.warn({ files }, "Conflicts detected; AI resolution not implemented");
		return { files, strategy: "manual", applied: false };
	}
}
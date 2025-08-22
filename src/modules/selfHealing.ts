import { writeFile } from "node:fs/promises";
import { createChildLogger } from "../shared/logger.js";
import type { FixSuggestion } from "../shared/types.js";
import { GitOps } from "./git.js";

export class SelfHealing {
	private readonly log = createChildLogger("self-healing");
	constructor(private readonly git: GitOps) {}

	async applySuggestions(branch: string, suggestions: FixSuggestion[]): Promise<{ applied: number; skipped: number }> {
		let applied = 0;
		let skipped = 0;
		for (const s of suggestions) {
			if (s.newContent) {
				await writeFile(s.filePath, s.newContent, "utf8");
				applied += 1;
				this.log.info({ file: s.filePath }, "Applied direct content update");
			} else if (s.patch) {
				// TODO: apply unified diff; for now we log
				skipped += 1;
				this.log.warn({ file: s.filePath }, "Patch application not yet implemented");
			} else {
				skipped += 1;
			}
		}
		if (applied > 0) {
			await this.git.commitAll(`chore(ai): apply ${applied} auto-fix(es)`);
		}
		return { applied, skipped };
	}
}

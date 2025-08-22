import { writeFile } from "node:fs/promises";
import { createChildLogger } from "../shared/logger.js";
export class SelfHealing {
    git;
    log = createChildLogger("self-healing");
    constructor(git) {
        this.git = git;
    }
    async applySuggestions(branch, suggestions) {
        let applied = 0;
        let skipped = 0;
        for (const s of suggestions) {
            if (s.newContent) {
                await writeFile(s.filePath, s.newContent, "utf8");
                applied += 1;
                this.log.info({ file: s.filePath }, "Applied direct content update");
            }
            else if (s.patch) {
                // TODO: apply unified diff; for now we log
                skipped += 1;
                this.log.warn({ file: s.filePath }, "Patch application not yet implemented");
            }
            else {
                skipped += 1;
            }
        }
        if (applied > 0) {
            await this.git.commitAll(`chore(ai): apply ${applied} auto-fix(es)`);
        }
        return { applied, skipped };
    }
}
//# sourceMappingURL=selfHealing.js.map
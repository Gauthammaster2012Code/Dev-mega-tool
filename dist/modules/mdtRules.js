import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { createChildLogger } from "../shared/logger.js";
const DEFAULT_RULES = {
    beforeCommit: { ensureTestsPass: true, blockOnConflicts: true },
    beforePush: { requireVerifiedKeys: false },
    beforeMerge: { blockOnAIFixPending: true },
    idePolicy: { queryMdtBeforeActions: true },
    state: { lastTaskId: null, lastUpdated: undefined },
};
export class MdtRulesManager {
    repoRoot;
    filePath;
    log = createChildLogger("mdt-rules");
    constructor(repoRoot, fileName = ".mdt-rules.json") {
        this.repoRoot = repoRoot;
        this.filePath = resolve(repoRoot, fileName);
    }
    async ensureExists() {
        try {
            await access(this.filePath, constants.F_OK);
        }
        catch {
            await this.write(DEFAULT_RULES);
        }
    }
    async read() {
        try {
            const raw = await readFile(this.filePath, "utf8");
            return JSON.parse(raw);
        }
        catch {
            await this.write(DEFAULT_RULES);
            return DEFAULT_RULES;
        }
    }
    async write(content) {
        const next = { ...DEFAULT_RULES, ...content, state: { ...(content.state || {}), lastUpdated: new Date().toISOString() } };
        await writeFile(this.filePath, JSON.stringify(next, null, 2), "utf8");
    }
}
//# sourceMappingURL=mdtRules.js.map
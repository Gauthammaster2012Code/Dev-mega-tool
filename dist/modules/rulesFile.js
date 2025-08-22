import { readFile, writeFile, rename, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { nanoid } from "nanoid";
import { createChildLogger } from "../shared/logger.js";
const DEFAULT_RULES = {
    currentBranch: null,
    task: {
        id: null,
        type: "idle",
        status: "idle",
    },
    testResults: {
        passed: 0,
        failed: 0,
        skipped: 0,
        reportPath: null,
        lastRunAt: undefined,
    },
    aiFix: {
        status: "idle",
        summary: null,
        lastAppliedAt: undefined,
    },
};
export class RulesFileManager {
    filePath;
    log = createChildLogger("rules-file");
    constructor(repoRoot, fileName = ".ai-tool-rules.json") {
        this.filePath = resolve(repoRoot, fileName);
    }
    async ensureExists() {
        try {
            await access(this.filePath, constants.F_OK);
        }
        catch {
            await this.writeAtomic(DEFAULT_RULES);
        }
    }
    async read() {
        try {
            const raw = await readFile(this.filePath, "utf8");
            return JSON.parse(raw);
        }
        catch (err) {
            this.log.warn({ err }, "Rules file missing or invalid, recreating");
            await this.writeAtomic(DEFAULT_RULES);
            return DEFAULT_RULES;
        }
    }
    async update(partial) {
        const current = await this.read();
        const next = { ...current, ...partial };
        await this.writeAtomic(next);
        return next;
    }
    async setTask(taskType, status) {
        const now = new Date().toISOString();
        const id = nanoid(8);
        return this.update({
            task: { id, type: taskType, status, startedAt: status === "running" ? now : undefined, updatedAt: now },
        });
    }
    async writeAtomic(content) {
        const tmpPath = `${this.filePath}.${nanoid(6)}.tmp`;
        await writeFile(tmpPath, JSON.stringify(content, null, 2), "utf8");
        await rename(tmpPath, this.filePath);
    }
}
//# sourceMappingURL=rulesFile.js.map
import { readFile, writeFile, rename, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { nanoid } from "nanoid";
import { createChildLogger } from "../shared/logger.js";
import type { AiToolRulesFile, TaskKind, TaskStatus } from "../shared/types.js";

const DEFAULT_RULES: AiToolRulesFile = {
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
	private readonly filePath: string;
	private readonly log = createChildLogger("rules-file");

	constructor(repoRoot: string, fileName = ".ai-tool-rules.json") {
		this.filePath = resolve(repoRoot, fileName);
	}

	async ensureExists(): Promise<void> {
		try {
			await access(this.filePath, constants.F_OK);
		} catch {
			await this.writeAtomic(DEFAULT_RULES);
		}
	}

	async read(): Promise<AiToolRulesFile> {
		try {
			const raw = await readFile(this.filePath, "utf8");
			return JSON.parse(raw) as AiToolRulesFile;
		} catch (err) {
			this.log.warn({ err }, "Rules file missing or invalid, recreating");
			await this.writeAtomic(DEFAULT_RULES);
			return DEFAULT_RULES;
		}
	}

	async update(partial: Partial<AiToolRulesFile>): Promise<AiToolRulesFile> {
		const current = await this.read();
		const next = { ...current, ...partial } satisfies AiToolRulesFile;
		await this.writeAtomic(next);
		return next;
	}

	async setTask(taskType: TaskKind, status: TaskStatus): Promise<AiToolRulesFile> {
		const now = new Date().toISOString();
		const id = nanoid(8);
		return this.update({
			task: { id, type: taskType, status, startedAt: status === "running" ? now : undefined, updatedAt: now },
		});
	}

	private async writeAtomic(content: AiToolRulesFile): Promise<void> {
		const tmpPath = `${this.filePath}.${nanoid(6)}.tmp`;
		await writeFile(tmpPath, JSON.stringify(content, null, 2), "utf8");
		await rename(tmpPath, this.filePath);
	}
}

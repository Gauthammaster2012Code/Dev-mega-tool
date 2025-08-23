import { readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { createChildLogger } from "../shared/logger.js";

export interface MdtRulesFile {
	beforeCommit: { ensureTestsPass: boolean; blockOnConflicts: boolean };
	beforePush: { requireVerifiedKeys: boolean };
	beforeMerge: { blockOnAIFixPending: boolean };
	idePolicy: { queryMdtBeforeActions: boolean };
	state: { lastTaskId?: string | null; lastUpdated?: string };
}

const DEFAULT_RULES: MdtRulesFile = {
	beforeCommit: { ensureTestsPass: true, blockOnConflicts: true },
	beforePush: { requireVerifiedKeys: false },
	beforeMerge: { blockOnAIFixPending: true },
	idePolicy: { queryMdtBeforeActions: true },
	state: { lastTaskId: null, lastUpdated: undefined },
};

export class MdtRulesManager {
	private readonly filePath: string;
	private readonly log = createChildLogger("mdt-rules");
	constructor(private readonly repoRoot: string, fileName = ".mdt-rules.json") {
		this.filePath = resolve(repoRoot, fileName);
	}
	async ensureExists(): Promise<void> {
		try { await access(this.filePath, constants.F_OK); } catch { await this.write(DEFAULT_RULES); }
	}
	async read(): Promise<MdtRulesFile> {
		try { const raw = await readFile(this.filePath, "utf8"); return JSON.parse(raw) as MdtRulesFile; } catch {
			await this.write(DEFAULT_RULES);
			return DEFAULT_RULES;
		}
	}
	async write(content: MdtRulesFile): Promise<void> {
		const next = { ...DEFAULT_RULES, ...content, state: { ...(content.state || {}), lastUpdated: new Date().toISOString() } };
		await writeFile(this.filePath, JSON.stringify(next, null, 2), "utf8");
	}
}
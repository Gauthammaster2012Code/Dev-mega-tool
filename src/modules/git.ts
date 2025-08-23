import simpleGit, { SimpleGit } from "simple-git";
import { customAlphabet } from "nanoid";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createChildLogger } from "../shared/logger.js";

const generateId = customAlphabet("123456789abcdefghijkmnopqrstuvwxyz", 6);

type ConflictStrategy = "ours" | "theirs";

export class GitOps {
	private readonly git: SimpleGit;
	private readonly log = createChildLogger("git-ops");

	constructor(private readonly repoPath: string) {
		this.git = simpleGit({ baseDir: repoPath });
	}

	async ensureRepo(): Promise<void> {
		const isRepo = await this.git.checkIsRepo();
		if (!isRepo) {
			await this.git.init();
			this.log.info("Initialized new Git repository");
		}
	}

	async currentBranch(): Promise<string> {
		const status = await this.git.status();
		return status.current || "main";
	}

	async status(): Promise<{ branch: string; uncommittedFiles: string[]; aheadBehind: { ahead: number; behind: number } }> {
		const s = await this.git.status();
		return { branch: s.current || "", uncommittedFiles: s.files.map((f) => f.path), aheadBehind: { ahead: s.ahead, behind: s.behind } };
	}

	async switchBranch(name: string, opts?: { createIfNotExists?: boolean; baseBranch?: string }): Promise<void> {
		const branches = await this.git.branchLocal();
		if (!branches.all.includes(name)) {
			if (opts?.createIfNotExists) {
				await this.git.checkoutBranch(name, opts.baseBranch || (await this.currentBranch()));
				return;
			}
			throw new Error(`Branch not found: ${name}`);
		}
		await this.git.checkout(name);
	}

	async mergeBranch(source: string, target: string, opts?: { squash?: boolean; dryRun?: boolean }): Promise<{ conflicts?: string[] }> {
		await this.git.checkout(target);
		if (opts?.dryRun) {
			try {
				await this.git.mergeFromTo(source, target, ["--no-commit", "--no-ff"]);
			} catch {
				// mergeFromTo may throw on conflicts; continue to inspect
			}
			const conflicts = (await this.listUnmergedFiles());
			await this.git.raw(["merge", "--abort"]).catch(() => {});
			return { conflicts };
		}
		const args: string[] = [];
		if (opts?.squash) args.push("--squash");
		await this.git.merge([source, ...args]);
		return {};
	}

	async createTempBranch(prefix: string): Promise<string> {
		const base = await this.currentBranch();
		const name = `${prefix}-${generateId()}`;
		await this.git.checkoutBranch(name, base);
		this.log.info({ name, base }, "Created temp branch");
		return name;
	}

	async deleteBranch(name: string): Promise<void> {
		await this.git.deleteLocalBranch(name, true);
	}

	async commitAll(message: string): Promise<void> {
		await this.git.add(["."]);
		await this.git.commit(message);
		this.log.debug({ message }, "Committed changes");
	}

	async hasUnmergedFiles(): Promise<boolean> {
		const result = await this.git.raw(["ls-files", "-u"]);
		return result.trim().length > 0;
	}

	async listUnmergedFiles(): Promise<string[]> {
		const output = await this.git.raw(["diff", "--name-only", "--diff-filter=U"]);
		return output
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
	}

	async resolveConflicts(files: string[], strategy: ConflictStrategy): Promise<void> {
		for (const file of files) {
			await this.git.raw(["checkout", strategy === "ours" ? "--ours" : "--theirs", "--", file]);
			await this.git.add([file]);
		}
		await this.commitAll(`chore(ai-merge): resolve conflicts using ${strategy}`);
	}

	async writeMdtStatus(meta: { branch: string; taskContext?: string }): Promise<void> {
		const path = resolve(this.repoPath, ".mdt-status.json");
		await writeFile(path, JSON.stringify({ ...meta, updatedAt: new Date().toISOString() }, null, 2), "utf8");
	}
}

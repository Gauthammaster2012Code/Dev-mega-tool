import simpleGit, { SimpleGit } from "simple-git";
import { customAlphabet } from "nanoid";
import { createChildLogger } from "../shared/logger.js";

const generateId = customAlphabet("123456789abcdefghijkmnopqrstuvwxyz", 6);

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

	async createTempBranch(prefix: string): Promise<string> {
		const base = await this.currentBranch();
		const name = `ai-tool/${prefix}-${generateId()}`;
		await this.git.checkoutBranch(name, base);
		this.log.info({ name, base }, "Created temp branch");
		return name;
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
}

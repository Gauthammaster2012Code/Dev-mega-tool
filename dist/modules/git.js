import simpleGit from "simple-git";
import { customAlphabet } from "nanoid";
import { createChildLogger } from "../shared/logger.js";
const generateId = customAlphabet("123456789abcdefghijkmnopqrstuvwxyz", 6);
export class GitOps {
    repoPath;
    git;
    log = createChildLogger("git-ops");
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.git = simpleGit({ baseDir: repoPath });
    }
    async ensureRepo() {
        const isRepo = await this.git.checkIsRepo();
        if (!isRepo) {
            await this.git.init();
            this.log.info("Initialized new Git repository");
        }
    }
    async currentBranch() {
        const status = await this.git.status();
        return status.current || "main";
    }
    async createTempBranch(prefix) {
        const base = await this.currentBranch();
        const name = `ai-tool/${prefix}-${generateId()}`;
        await this.git.checkoutBranch(name, base);
        this.log.info({ name, base }, "Created temp branch");
        return name;
    }
    async commitAll(message) {
        await this.git.add(["."]);
        await this.git.commit(message);
        this.log.debug({ message }, "Committed changes");
    }
    async hasUnmergedFiles() {
        const result = await this.git.raw(["ls-files", "-u"]);
        return result.trim().length > 0;
    }
    async listUnmergedFiles() {
        const output = await this.git.raw(["diff", "--name-only", "--diff-filter=U"]);
        return output
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    async resolveConflicts(files, strategy) {
        for (const file of files) {
            await this.git.raw(["checkout", strategy === "ours" ? "--ours" : "--theirs", "--", file]);
            await this.git.add([file]);
        }
        await this.commitAll(`chore(ai-merge): resolve conflicts using ${strategy}`);
    }
}
//# sourceMappingURL=git.js.map
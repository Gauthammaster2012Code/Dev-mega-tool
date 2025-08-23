import simpleGit from "simple-git";
import { customAlphabet } from "nanoid";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
    async status() {
        const s = await this.git.status();
        return { branch: s.current || "", uncommittedFiles: s.files.map((f) => f.path), aheadBehind: { ahead: s.ahead, behind: s.behind } };
    }
    async switchBranch(name, opts) {
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
    async mergeBranch(source, target, opts) {
        await this.git.checkout(target);
        if (opts?.dryRun) {
            try {
                await this.git.mergeFromTo(source, target, ["--no-commit", "--no-ff"]);
            }
            catch {
                // mergeFromTo may throw on conflicts; continue to inspect
            }
            const conflicts = (await this.listUnmergedFiles());
            await this.git.raw(["merge", "--abort"]).catch(() => { });
            return { conflicts };
        }
        const args = [];
        if (opts?.squash)
            args.push("--squash");
        await this.git.merge([source, ...args]);
        return {};
    }
    async createTempBranch(prefix) {
        const base = await this.currentBranch();
        const name = `${prefix}-${generateId()}`;
        await this.git.checkoutBranch(name, base);
        this.log.info({ name, base }, "Created temp branch");
        return name;
    }
    async deleteBranch(name) {
        await this.git.deleteLocalBranch(name, true);
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
    async writeMdtStatus(meta) {
        const path = resolve(this.repoPath, ".mdt-status.json");
        await writeFile(path, JSON.stringify({ ...meta, updatedAt: new Date().toISOString() }, null, 2), "utf8");
    }
}
//# sourceMappingURL=git.js.map
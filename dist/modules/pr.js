import { Octokit } from "octokit";
import { createChildLogger } from "../shared/logger.js";
export async function createPullRequest(params) {
    const log = createChildLogger("pr");
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
    if (!token) {
        log.warn("No GitHub token set; skipping PR creation");
        return null;
    }
    const client = new Octokit({ auth: token });
    const [owner, repo] = params.repo.split("/");
    const res = await client.request("POST /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        title: params.title,
        base: params.base,
        head: params.head,
        body: params.body || "Automated PR from MCP mega-tool",
    });
    return { url: res.data.html_url };
}
//# sourceMappingURL=pr.js.map
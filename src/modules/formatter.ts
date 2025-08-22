import { spawn } from "node:child_process";
import { createChildLogger } from "../shared/logger.js";

export class Formatter {
	private readonly log = createChildLogger("formatter");
	async run(): Promise<{ ok: boolean; filesChanged: number }> {
		return new Promise((resolve) => {
			const p = spawn("npx", ["--yes", "prettier", "--write", "."], { stdio: ["ignore", "pipe", "pipe"] });
			let stdout = "";
			let stderr = "";
			p.stdout.on("data", (d) => (stdout += d.toString()));
			p.stderr.on("data", (d) => (stderr += d.toString()));
			p.on("close", () => {
				const matches = stdout.match(/(\d+) files? fixed/gi);
				const filesChanged = matches ? matches.reduce((acc, m) => acc + (parseInt(m, 10) || 0), 0) : 0;
				if (stderr.trim()) this.log.warn({ stderr }, "Prettier warnings");
				resolve({ ok: true, filesChanged });
			});
		});
	}
}
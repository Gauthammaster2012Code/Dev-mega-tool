import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, extname, relative } from "node:path";
import { createChildLogger } from "../shared/logger.js";

export interface CodebaseIndex {
	generatedAt: string;
	files: Array<{ path: string; language: string; exports: string[]; hasTests: boolean }>;
	languages: Record<string, number>;
	coverage: Record<string, { tests: string[]; covered: boolean }>;
	arch: "mvc" | "clean" | "monolith" | "microservice" | "unknown";
}

const DEFAULT_DIRS = ["src", "lib", "app"];

export class Analyzer {
	private readonly log = createChildLogger("analyzer");
	constructor(private readonly repoRoot: string) {}

	async analyze(): Promise<CodebaseIndex> {
		const entries: CodebaseIndex["files"] = [];
		const coverage: CodebaseIndex["coverage"] = {};
		const languages: Record<string, number> = {};
		const roots = await this.existingRoots();
		for (const root of roots) {
			await this.walk(root, async (abs, rel) => {
				const lang = this.detectLang(abs);
				languages[lang] = (languages[lang] || 0) + 1;
				const source = await readFile(abs, "utf8").catch(() => "");
				const exps = this.extractExports(source);
				const tests = this.findTestsFor(rel);
				entries.push({ path: rel, language: lang, exports: exps, hasTests: tests.length > 0 });
				coverage[rel] = { tests, covered: tests.length > 0 };
			});
		}
		const arch = this.detectArch(roots);
		const index: CodebaseIndex = { generatedAt: new Date().toISOString(), files: entries, languages, coverage, arch };
		await writeFile(resolve(this.repoRoot, ".mdt-index.json"), JSON.stringify(index, null, 2), "utf8");
		return index;
	}

	private async existingRoots(): Promise<string[]> {
		const out: string[] = [];
		for (const d of DEFAULT_DIRS) {
			const p = resolve(this.repoRoot, d);
			try { if ((await stat(p)).isDirectory()) out.push(p); } catch {}
		}
		return out;
	}

	private async walk(dir: string, onFile: (abs: string, rel: string) => Promise<void>): Promise<void> {
		const items = await readdir(dir, { withFileTypes: true });
		for (const it of items) {
			const abs = resolve(dir, it.name);
			if (it.isDirectory()) { await this.walk(abs, onFile); continue; }
			if (!/[.](ts|js|tsx|jsx)$/i.test(it.name)) continue;
			const rel = relative(this.repoRoot, abs);
			await onFile(abs, rel);
		}
	}

	private detectLang(path: string): string {
		const ext = extname(path).toLowerCase();
		if (ext === ".ts" || ext === ".tsx") return "ts";
		if (ext === ".js" || ext === ".jsx") return "js";
		return "other";
	}

	private extractExports(source: string): string[] {
		const names: string[] = [];
		const re = /export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_]+)/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(source))) names.push(m[1]);
		return names;
	}

	private findTestsFor(rel: string): string[] {
		const base = rel.replace(/[.](ts|js|tsx|jsx)$/i, "");
		const candidates = [
			`${base}.test.ts`, `${base}.spec.ts`, `${base}.test.js`, `${base}.spec.js`,
		];
		return candidates.filter(() => false); // Placeholder: could check fs existence quickly
	}

	private detectArch(roots: string[]): CodebaseIndex["arch"] {
		if (roots.some((r) => /controllers|models|views/i.test(r))) return "mvc";
		if (roots.some((r) => /usecases|entities|adapters/i.test(r))) return "clean";
		return "unknown";
	}
}
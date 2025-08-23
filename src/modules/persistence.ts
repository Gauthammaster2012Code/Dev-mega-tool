import { createChildLogger } from "../shared/logger.js";
import type { TestRunResult, FixSuggestion, AIEvalFindings } from "../shared/types.js";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Lightweight database interface used by Persistence
interface DatabaseLike {
	exec: (sql: string) => unknown;
	prepare: (sql: string) => { run: (...args: any[]) => unknown; all: (...args: any[]) => any[] };
}

// JSON fallback database that emulates the tiny subset of better-sqlite3 we use
class JsonDatabase implements DatabaseLike {
	private readonly filePath: string;
	private data: {
		test_runs: Array<{ id: string; created_at: string; passed: number; failed: number; skipped: number; duration_ms: number; report_path: string | null }>;
		fixes: Array<{ id: string; created_at: string; branch: string; description: string; success: number }>;
		merge_conflicts: Array<{ id: string; created_at: string; files: string[]; resolution: string | null; success: number }>;
		ai_findings: Array<{ id: string; created_at: string; severity: "low" | "medium" | "high"; patterns: string; root_causes: string; suggestions: string }>;
		visual_results: Array<{ id: string; created_at: string; url: string; diff_pixels: number; width: number; height: number; baseline_path: string; output_path: string; diff_path: string }>;
	};
	private readonly log = createChildLogger("persistence-json");

	constructor(filePath: string) {
		this.filePath = filePath.replace(/\.db$/i, ".json");
		this.ensureDir();
		this.data = this.load();
		this.save();
	}

	exec(_sql: string): void {
		// No-op: tables are implicit in JSON. Ensure file exists.
		this.save();
	}

	prepare(sql: string) {
		const self = this;
		if (sql.includes("INSERT INTO test_runs")) {
			return {
				run(id: string, passed: number, failed: number, skipped: number, durationMs: number, reportPath: string | null) {
					self.data.test_runs.unshift({
						id,
						created_at: new Date().toISOString(),
						passed,
						failed,
						skipped,
						duration_ms: durationMs,
						report_path: reportPath,
					});
					self.save();
				},
				all: () => [],
			};
		}
		if (sql.includes("INSERT INTO fixes")) {
			return {
				run(id: string, branch: string, description: string, success: number) {
					self.data.fixes.unshift({ id, created_at: new Date().toISOString(), branch, description, success });
					self.save();
				},
				all: () => [],
			};
		}
		if (sql.includes("INSERT INTO merge_conflicts")) {
			return {
				run(id: string, filesJson: string, resolution: string | null, success: number) {
					let files: string[] = [];
					try { files = JSON.parse(filesJson); } catch { /* ignore */ }
					self.data.merge_conflicts.unshift({ id, created_at: new Date().toISOString(), files, resolution, success });
					self.save();
				},
				all: () => [],
			};
		}
		if (sql.includes("INSERT INTO ai_findings")) {
			return {
				run(id: string, severity: "low" | "medium" | "high", patternsJson: string, rootCausesJson: string, suggestionsJson: string) {
					self.data.ai_findings.unshift({ id, created_at: new Date().toISOString(), severity, patterns: patternsJson, root_causes: rootCausesJson, suggestions: suggestionsJson });
					self.save();
				},
				all: () => [],
			};
		}
		if (sql.includes("INSERT INTO visual_results")) {
			return {
				run(id: string, url: string, diffPixels: number, width: number, height: number, baselinePath: string, outputPath: string, diffPath: string) {
					self.data.visual_results.unshift({ id, created_at: new Date().toISOString(), url, diff_pixels: diffPixels, width, height, baseline_path: baselinePath, output_path: outputPath, diff_path: diffPath });
					self.save();
				},
				all: () => [],
			};
		}
		if (sql.includes("SELECT id, failed, created_at FROM test_runs")) {
			return {
				run: () => {},
				all(limit: number) {
					return self.data.test_runs
						.slice()
						.sort((a, b) => b.created_at.localeCompare(a.created_at))
						.slice(0, limit)
						.map(({ id, failed, created_at }) => ({ id, failed, created_at }));
				},
			};
		}
		if (sql.includes("SELECT id, branch, success, created_at FROM fixes")) {
			return {
				run: () => {},
				all(limit: number) {
					return self.data.fixes
						.slice()
						.sort((a, b) => b.created_at.localeCompare(a.created_at))
						.slice(0, limit)
						.map(({ id, branch, success, created_at }) => ({ id, branch, success, created_at }));
				},
			};
		}
		return { run: () => {}, all: () => [] };
	}

	private ensureDir() {
		const dir = dirname(this.filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}
	}

	private load() {
		if (!existsSync(this.filePath)) {
			return { test_runs: [], fixes: [], merge_conflicts: [], ai_findings: [], visual_results: [] };
		}
		try {
			const raw = readFileSync(this.filePath, "utf-8");
			const parsed = JSON.parse(raw);
			return {
				test_runs: Array.isArray(parsed.test_runs) ? parsed.test_runs : [],
				fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
				merge_conflicts: Array.isArray(parsed.merge_conflicts) ? parsed.merge_conflicts : [],
				ai_findings: Array.isArray(parsed.ai_findings) ? parsed.ai_findings : [],
				visual_results: Array.isArray(parsed.visual_results) ? parsed.visual_results : [],
			};
		} catch {
			return { test_runs: [], fixes: [], merge_conflicts: [], ai_findings: [], visual_results: [] };
		}
	}

	private save() {
		try {
			writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
		} catch {
			// ignore
		}
	}
}

export class Persistence {
	private readonly db: DatabaseLike;
	private readonly log = createChildLogger("persistence");

	constructor(dbFilePath: string) {
		// Try to load better-sqlite3 at runtime. If it fails (e.g., native binding mismatch), fall back to JSON.
		let db: DatabaseLike = new JsonDatabase(dbFilePath);
		try {
			const require = createRequire(import.meta.url);
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			const BetterSqlite3 = require("better-sqlite3");
			db = new BetterSqlite3(dbFilePath);
			this.log.debug({ dbFilePath }, "Using better-sqlite3 for persistence");
		} catch (err) {
			this.log.warn({ err }, "better-sqlite3 unavailable; falling back to JSON persistence");
		}
		this.db = db;
		this.initialize();
	}

	private initialize(): void {
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS test_runs (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				passed INTEGER NOT NULL,
				failed INTEGER NOT NULL,
				skipped INTEGER NOT NULL,
				duration_ms INTEGER NOT NULL,
				report_path TEXT
			);

			CREATE TABLE IF NOT EXISTS fixes (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				branch TEXT NOT NULL,
				description TEXT NOT NULL,
				success INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS merge_conflicts (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				files TEXT NOT NULL,
				resolution TEXT,
				success INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS ai_findings (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				severity TEXT NOT NULL,
				patterns TEXT NOT NULL,
				root_causes TEXT NOT NULL,
				suggestions TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS visual_results (
				id TEXT PRIMARY KEY,
				created_at TEXT NOT NULL,
				url TEXT NOT NULL,
				diff_pixels INTEGER NOT NULL,
				width INTEGER NOT NULL,
				height INTEGER NOT NULL,
				baseline_path TEXT NOT NULL,
				output_path TEXT NOT NULL,
				diff_path TEXT NOT NULL
			);
		`);
	}

	recordTestRun(id: string, result: TestRunResult, reportPath: string | null): void {
		const stmt = this.db.prepare(
			`INSERT INTO test_runs (id, created_at, passed, failed, skipped, duration_ms, report_path)
			 VALUES (?, datetime('now'), ?, ?, ?, ?, ?)`
		);
		stmt.run(id, result.passed, result.failed, result.skipped, result.durationMs, reportPath);
		this.log.debug({ id }, "Recorded test run");
	}

	recordFix(id: string, branch: string, description: string, success: boolean): void {
		const stmt = this.db.prepare(
			`INSERT INTO fixes (id, created_at, branch, description, success)
			 VALUES (?, datetime('now'), ?, ?, ?)`
		);
		stmt.run(id, branch, description, success ? 1 : 0);
		this.log.debug({ id, branch }, "Recorded fix");
	}

	recordMergeConflict(id: string, files: string[], resolution: string | null, success: boolean): void {
		const stmt = this.db.prepare(
			`INSERT INTO merge_conflicts (id, created_at, files, resolution, success)
			 VALUES (?, datetime('now'), ?, ?, ?)`
		);
		stmt.run(id, JSON.stringify(files), resolution, success ? 1 : 0);
		this.log.debug({ id, count: files.length }, "Recorded merge conflict");
	}

	recordAIFindings(id: string, findings: AIEvalFindings): void {
		const stmt = this.db.prepare(
			`INSERT INTO ai_findings (id, created_at, severity, patterns, root_causes, suggestions)
			 VALUES (?, datetime('now'), ?, ?, ?, ?)`
		);
		stmt.run(
			id,
			findings.severity,
			JSON.stringify(findings.patterns),
			JSON.stringify(findings.rootCauses),
			JSON.stringify(findings.suggestions)
		);
		this.log.debug({ id }, "Recorded AI findings");
	}

	recordVisualResult(id: string, args: { url: string; diffPixels: number; width: number; height: number; baselinePath: string; outputPath: string; diffPath: string; }): void {
		const stmt = this.db.prepare(
			`INSERT INTO visual_results (id, created_at, url, diff_pixels, width, height, baseline_path, output_path, diff_path)
			 VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`
		);
		stmt.run(id, args.url, args.diffPixels, args.width, args.height, args.baselinePath, args.outputPath, args.diffPath);
		this.log.debug({ id, url: args.url }, "Recorded visual result");
	}

	// Basic queries that could be used by learning components
	getRecentFailures(limit = 20): Array<{ id: string; failed: number; created_at: string }> {
		const stmt = this.db.prepare(
			`SELECT id, failed, created_at FROM test_runs ORDER BY datetime(created_at) DESC LIMIT ?`
		);
		return stmt.all(limit) as Array<{ id: string; failed: number; created_at: string }>;
	}

	getFixHistory(limit = 50): Array<{ id: string; branch: string; success: number; created_at: string }> {
		const stmt = this.db.prepare(
			`SELECT id, branch, success, created_at FROM fixes ORDER BY datetime(created_at) DESC LIMIT ?`
		);
		return stmt.all(limit) as Array<{ id: string; branch: string; success: number; created_at: string }>;
	}
}

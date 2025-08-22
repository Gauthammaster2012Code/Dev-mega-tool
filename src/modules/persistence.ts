import Database from "better-sqlite3";
import { createChildLogger } from "../shared/logger.js";
import type { TestRunResult, FixSuggestion, AIEvalFindings } from "../shared/types.js";

export class Persistence {
	private readonly db: Database.Database;
	private readonly log = createChildLogger("persistence");

	constructor(dbFilePath: string) {
		this.db = new Database(dbFilePath);
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

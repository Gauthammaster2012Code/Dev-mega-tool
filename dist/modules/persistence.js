import Database from "better-sqlite3";
import { createChildLogger } from "../shared/logger.js";
export class Persistence {
    db;
    log = createChildLogger("persistence");
    constructor(dbFilePath) {
        this.db = new Database(dbFilePath);
        this.initialize();
    }
    initialize() {
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
		`);
    }
    recordTestRun(id, result, reportPath) {
        const stmt = this.db.prepare(`INSERT INTO test_runs (id, created_at, passed, failed, skipped, duration_ms, report_path)
			 VALUES (?, datetime('now'), ?, ?, ?, ?, ?)`);
        stmt.run(id, result.passed, result.failed, result.skipped, result.durationMs, reportPath);
        this.log.debug({ id }, "Recorded test run");
    }
    recordFix(id, branch, description, success) {
        const stmt = this.db.prepare(`INSERT INTO fixes (id, created_at, branch, description, success)
			 VALUES (?, datetime('now'), ?, ?, ?)`);
        stmt.run(id, branch, description, success ? 1 : 0);
        this.log.debug({ id, branch }, "Recorded fix");
    }
    recordMergeConflict(id, files, resolution, success) {
        const stmt = this.db.prepare(`INSERT INTO merge_conflicts (id, created_at, files, resolution, success)
			 VALUES (?, datetime('now'), ?, ?, ?)`);
        stmt.run(id, JSON.stringify(files), resolution, success ? 1 : 0);
        this.log.debug({ id, count: files.length }, "Recorded merge conflict");
    }
    // Basic queries that could be used by learning components
    getRecentFailures(limit = 20) {
        const stmt = this.db.prepare(`SELECT id, failed, created_at FROM test_runs ORDER BY datetime(created_at) DESC LIMIT ?`);
        return stmt.all(limit);
    }
    getFixHistory(limit = 50) {
        const stmt = this.db.prepare(`SELECT id, branch, success, created_at FROM fixes ORDER BY datetime(created_at) DESC LIMIT ?`);
        return stmt.all(limit);
    }
}
//# sourceMappingURL=persistence.js.map
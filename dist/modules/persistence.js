import { createChildLogger } from "../shared/logger.js";
import { createRequire } from "node:module";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
// JSON fallback database that emulates the tiny subset of better-sqlite3 we use
class JsonDatabase {
    filePath;
    data;
    log = createChildLogger("persistence-json");
    constructor(filePath) {
        this.filePath = filePath.replace(/\.db$/i, ".json");
        this.ensureDir();
        this.data = this.load();
        this.save();
    }
    exec(_sql) {
        // No-op: tables are implicit in JSON. Ensure file exists.
        this.save();
    }
    prepare(sql) {
        const self = this;
        if (sql.includes("INSERT INTO test_runs")) {
            return {
                run(id, passed, failed, skipped, durationMs, reportPath) {
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
                run(id, branch, description, success) {
                    self.data.fixes.unshift({ id, created_at: new Date().toISOString(), branch, description, success });
                    self.save();
                },
                all: () => [],
            };
        }
        if (sql.includes("INSERT INTO merge_conflicts")) {
            return {
                run(id, filesJson, resolution, success) {
                    let files = [];
                    try {
                        files = JSON.parse(filesJson);
                    }
                    catch { /* ignore */ }
                    self.data.merge_conflicts.unshift({ id, created_at: new Date().toISOString(), files, resolution, success });
                    self.save();
                },
                all: () => [],
            };
        }
        if (sql.includes("INSERT INTO ai_findings")) {
            return {
                run(id, severity, patternsJson, rootCausesJson, suggestionsJson) {
                    self.data.ai_findings.unshift({ id, created_at: new Date().toISOString(), severity, patterns: patternsJson, root_causes: rootCausesJson, suggestions: suggestionsJson });
                    self.save();
                },
                all: () => [],
            };
        }
        if (sql.includes("INSERT INTO visual_results")) {
            return {
                run(id, url, diffPixels, width, height, baselinePath, outputPath, diffPath) {
                    self.data.visual_results.unshift({ id, created_at: new Date().toISOString(), url, diff_pixels: diffPixels, width, height, baseline_path: baselinePath, output_path: outputPath, diff_path: diffPath });
                    self.save();
                },
                all: () => [],
            };
        }
        if (sql.includes("SELECT id, failed, created_at FROM test_runs")) {
            return {
                run: () => { },
                all(limit) {
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
                run: () => { },
                all(limit) {
                    return self.data.fixes
                        .slice()
                        .sort((a, b) => b.created_at.localeCompare(a.created_at))
                        .slice(0, limit)
                        .map(({ id, branch, success, created_at }) => ({ id, branch, success, created_at }));
                },
            };
        }
        return { run: () => { }, all: () => [] };
    }
    ensureDir() {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
    load() {
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
        }
        catch {
            return { test_runs: [], fixes: [], merge_conflicts: [], ai_findings: [], visual_results: [] };
        }
    }
    save() {
        try {
            writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
        }
        catch {
            // ignore
        }
    }
}
export class Persistence {
    db;
    log = createChildLogger("persistence");
    constructor(dbFilePath) {
        // Try to load better-sqlite3 at runtime. If it fails (e.g., native binding mismatch), fall back to JSON.
        let db = new JsonDatabase(dbFilePath);
        try {
            const require = createRequire(import.meta.url);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const BetterSqlite3 = require("better-sqlite3");
            db = new BetterSqlite3(dbFilePath);
            this.log.debug({ dbFilePath }, "Using better-sqlite3 for persistence");
        }
        catch (err) {
            this.log.warn({ err }, "better-sqlite3 unavailable; falling back to JSON persistence");
        }
        this.db = db;
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
    recordAIFindings(id, findings) {
        const stmt = this.db.prepare(`INSERT INTO ai_findings (id, created_at, severity, patterns, root_causes, suggestions)
			 VALUES (?, datetime('now'), ?, ?, ?, ?)`);
        stmt.run(id, findings.severity, JSON.stringify(findings.patterns), JSON.stringify(findings.rootCauses), JSON.stringify(findings.suggestions));
        this.log.debug({ id }, "Recorded AI findings");
    }
    recordVisualResult(id, args) {
        const stmt = this.db.prepare(`INSERT INTO visual_results (id, created_at, url, diff_pixels, width, height, baseline_path, output_path, diff_path)
			 VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(id, args.url, args.diffPixels, args.width, args.height, args.baselinePath, args.outputPath, args.diffPath);
        this.log.debug({ id, url: args.url }, "Recorded visual result");
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
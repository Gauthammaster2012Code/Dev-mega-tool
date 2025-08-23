export type TaskKind =
	| "idle"
	| "run-tests"
	| "fix-merge-conflicts"
	| "format-code"
	| "analyze";

export type TaskStatus = "idle" | "pending" | "running" | "complete" | "error";

export interface AiToolRulesFile {
	currentBranch: string | null;
	// Optional path to an IDE-readable rules file (e.g., .ai-tool-rules.mdc)
	rulesPath?: string;
	task: {
		id: string | null;
		type: TaskKind;
		status: TaskStatus;
		startedAt?: string;
		updatedAt?: string;
	};
	testResults?: {
		passed: number;
		failed: number;
		skipped: number;
		lastRunAt?: string;
		reportPath?: string | null;
	};
	aiFix?: {
		status: TaskStatus;
		summary?: string | null;
		lastAppliedAt?: string;
	};
}

export interface TestRunResult {
	passed: number;
	failed: number;
	skipped: number;
	durationMs: number;
	reports?: {
		jest?: string | null;
	};
	raw?: unknown;
}

export interface FixSuggestion {
	filePath: string;
	description: string;
	newContent?: string;
	patch?: string; // optional unified diff
	severity?: "low" | "medium" | "high";
}

export interface AIEvalFindings {
	rootCauses: string[];
	patterns: string[];
	severity: "low" | "medium" | "high";
	suggestions: FixSuggestion[];
}

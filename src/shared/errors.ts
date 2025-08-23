export type MdtErrorCode =
	| "MDT_GIT"
	| "MDT_GIT_CONFLICT"
	| "MDT_ANALYZE"
	| "MDT_GEN"
	| "MDT_TEST"
	| "MDT_TEST_AI"
	| "MDT_VISUAL"
	| "MDT_FIX"
	| "MDT_CONFLICT"
	| "MDT_CONFIG"
	| "MDT_RULES"
	| "MDT_KEY";

export interface MdtErrorShape {
	code: MdtErrorCode;
	message: string;
	retryable?: boolean;
	suggestedAction?: string;
}

export function createError(code: MdtErrorCode, message: string, opts?: { retryable?: boolean; suggestedAction?: string }): MdtErrorShape {
	return { code, message, retryable: opts?.retryable, suggestedAction: opts?.suggestedAction };
}
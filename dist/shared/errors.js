export function createError(code, message, opts) {
    return { code, message, retryable: opts?.retryable, suggestedAction: opts?.suggestedAction };
}
//# sourceMappingURL=errors.js.map
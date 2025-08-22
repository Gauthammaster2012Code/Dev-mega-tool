export function loadConfig(repoRoot) {
    return {
        openaiApiKey: process.env.OPENAI_API_KEY || null,
        cvBaselineDir: process.env.CV_BASELINE_DIR || ".visual/baseline",
        cvOutputDir: process.env.CV_OUTPUT_DIR || ".visual/output",
        repoRoot,
    };
}
//# sourceMappingURL=config.js.map
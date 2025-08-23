export interface AppConfig {
    openaiApiKey: string | null;
    cvBaselineDir: string;
    cvOutputDir: string;
    repoRoot: string;
}
export declare function loadConfig(repoRoot: string): AppConfig;
//# sourceMappingURL=config.d.ts.map
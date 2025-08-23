export interface VisualResult {
    url: string;
    baselinePath: string;
    outputPath: string;
    diffPath: string;
    diffPixels: number;
    width: number;
    height: number;
}
export declare class VisualRunner {
    private readonly repoRoot;
    private readonly log;
    constructor(repoRoot: string);
    runOnce(url: string, name: string): Promise<VisualResult>;
}
//# sourceMappingURL=visualRunner.d.ts.map
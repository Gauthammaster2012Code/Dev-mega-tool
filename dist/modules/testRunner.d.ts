import type { TestRunResult } from "../shared/types.js";
export declare class TestRunner {
    private readonly log;
    runAll(): Promise<TestRunResult>;
    private tryJest;
    private tryMocha;
}
//# sourceMappingURL=testRunner.d.ts.map
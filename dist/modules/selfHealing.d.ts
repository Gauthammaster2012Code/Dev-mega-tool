import type { FixSuggestion } from "../shared/types.js";
import { GitOps } from "./git.js";
export declare class SelfHealing {
    private readonly git;
    private readonly log;
    constructor(git: GitOps);
    applySuggestions(branch: string, suggestions: FixSuggestion[]): Promise<{
        applied: number;
        skipped: number;
    }>;
}
//# sourceMappingURL=selfHealing.d.ts.map
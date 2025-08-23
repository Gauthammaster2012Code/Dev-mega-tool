import type { AiToolRulesFile, TaskKind, TaskStatus } from "../shared/types.js";
export declare class RulesFileManager {
    private readonly filePath;
    private readonly log;
    constructor(repoRoot: string, fileName?: string);
    ensureExists(): Promise<void>;
    read(): Promise<AiToolRulesFile>;
    update(partial: Partial<AiToolRulesFile>): Promise<AiToolRulesFile>;
    setTask(taskType: TaskKind, status: TaskStatus): Promise<AiToolRulesFile>;
    private writeAtomic;
}
//# sourceMappingURL=rulesFile.d.ts.map
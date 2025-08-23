export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    output?: string;
}
export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
    execute: (params: any) => Promise<ToolResult>;
}
export declare class ToolCaller {
    private readonly log;
    private readonly repoRoot;
    private readonly git;
    private readonly testRunner;
    private readonly formatter;
    private readonly visualRunner;
    private readonly rules;
    constructor(repoRoot: string);
    initialize(): Promise<void>;
    getSystemPrompt(): string;
    getAvailableTools(): Tool[];
    private buildProjectTree;
    executeTool(toolName: string, parameters: any): Promise<ToolResult>;
}
export default ToolCaller;
//# sourceMappingURL=toolCalling.d.ts.map
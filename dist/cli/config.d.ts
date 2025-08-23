#!/usr/bin/env node
import "dotenv/config";
interface Config {
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    GEMINI_API_KEY?: string;
    GOOGLE_API_KEY?: string;
    DASHSCOPE_API_KEY?: string;
    AI_PROVIDER?: 'openai' | 'claude' | 'gemini' | 'qwen' | 'simple';
    ANTHROPIC_BASE_URL?: string;
    OPENAI_BASE_URL?: string;
}
declare class ConfigManager {
    private configPath;
    private envPath;
    constructor();
    loadConfig(): Promise<Config>;
    saveConfig(config: Config): Promise<void>;
    private updateEnvFile;
    promptForInput(question: string, mask?: boolean): Promise<string>;
}
export { ConfigManager };
//# sourceMappingURL=config.d.ts.map
#!/usr/bin/env node
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { logger } from "../shared/logger.js";
class ConfigManager {
    configPath;
    envPath;
    constructor() {
        this.configPath = resolve(process.cwd(), '.mcp-config.json');
        this.envPath = resolve(process.cwd(), '.env');
    }
    async loadConfig() {
        try {
            const data = await readFile(this.configPath, 'utf-8');
            return JSON.parse(data);
        }
        catch {
            return {};
        }
    }
    async saveConfig(config) {
        await writeFile(this.configPath, JSON.stringify(config, null, 2));
        await this.updateEnvFile(config);
    }
    async updateEnvFile(config) {
        let envContent = '';
        // Try to read existing .env file
        try {
            envContent = await readFile(this.envPath, 'utf-8');
        }
        catch {
            // File doesn't exist, start with empty content
        }
        // Update or add config values
        for (const [key, value] of Object.entries(config)) {
            if (value) {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                const line = `${key}=${value}`;
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, line);
                }
                else {
                    envContent += envContent.endsWith('\n') || !envContent ? '' : '\n';
                    envContent += `${line}\n`;
                }
            }
        }
        await writeFile(this.envPath, envContent);
    }
    async promptForInput(question, mask = false) {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise((resolve) => {
            if (mask) {
                // Hide input for API keys
                const stdin = process.stdin;
                stdin.setRawMode(true);
                let input = '';
                const onData = (char) => {
                    const c = char.toString();
                    if (c === '\r' || c === '\n') {
                        stdin.setRawMode(false);
                        stdin.removeListener('data', onData);
                        console.log('');
                        rl.close();
                        resolve(input);
                    }
                    else if (c === '\u0003') {
                        // Ctrl+C
                        process.exit(0);
                    }
                    else if (c === '\u007f' || c === '\b') {
                        // Backspace
                        if (input.length > 0) {
                            input = input.slice(0, -1);
                            process.stdout.write('\b \b');
                        }
                    }
                    else if (c >= ' ') {
                        input += c;
                        process.stdout.write('*');
                    }
                };
                process.stdout.write(question);
                stdin.on('data', onData);
            }
            else {
                rl.question(question, (answer) => {
                    rl.close();
                    resolve(answer);
                });
            }
        });
    }
}
async function showCurrentConfig() {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    console.log('\n🔧 Current Configuration:');
    console.log('========================');
    const providers = [
        { key: 'OPENAI_API_KEY', name: 'OpenAI', provider: 'openai' },
        { key: 'ANTHROPIC_API_KEY', name: 'Anthropic Claude', provider: 'claude' },
        { key: 'GEMINI_API_KEY', name: 'Google Gemini', provider: 'gemini' },
        { key: 'GOOGLE_API_KEY', name: 'Google API', provider: 'gemini' },
        { key: 'DASHSCOPE_API_KEY', name: 'Qwen/DashScope', provider: 'qwen' },
    ];
    for (const { key, name, provider } of providers) {
        const hasKey = !!(config[key] || process.env[key]);
        const status = hasKey ? '✅ Configured' : '❌ Not set';
        const current = config.AI_PROVIDER === provider ? ' (ACTIVE)' : '';
        console.log(`${name}: ${status}${current}`);
    }
    console.log(`\nDefault AI Provider: ${config.AI_PROVIDER || 'simple (local heuristic)'}`);
    if (config.ANTHROPIC_BASE_URL) {
        console.log(`Anthropic Base URL: ${config.ANTHROPIC_BASE_URL}`);
    }
    if (config.OPENAI_BASE_URL) {
        console.log(`OpenAI Base URL: ${config.OPENAI_BASE_URL}`);
    }
}
async function configureProvider() {
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    console.log('\n🤖 Configure AI Provider');
    console.log('========================');
    console.log('1. OpenAI (GPT-4, GPT-3.5)');
    console.log('2. Anthropic Claude');
    console.log('3. Google Gemini');
    console.log('4. Qwen/DashScope');
    console.log('5. Simple (Local heuristic - no API key needed)');
    console.log('6. Configure custom endpoints');
    console.log('0. Back to main menu');
    const choice = await configManager.promptForInput('\nSelect provider (0-6): ');
    switch (choice) {
        case '1':
            await configureOpenAI(configManager, config);
            break;
        case '2':
            await configureClaude(configManager, config);
            break;
        case '3':
            await configureGemini(configManager, config);
            break;
        case '4':
            await configureQwen(configManager, config);
            break;
        case '5':
            config.AI_PROVIDER = 'simple';
            await configManager.saveConfig(config);
            console.log('✅ Configured to use Simple (local heuristic) provider');
            break;
        case '6':
            await configureCustomEndpoints(configManager, config);
            break;
        case '0':
            return;
        default:
            console.log('❌ Invalid choice');
    }
}
async function configureOpenAI(configManager, config) {
    console.log('\n🔑 Configure OpenAI');
    const apiKey = await configManager.promptForInput('Enter OpenAI API Key (sk-...): ', true);
    if (apiKey) {
        config.OPENAI_API_KEY = apiKey;
        config.AI_PROVIDER = 'openai';
        await configManager.saveConfig(config);
        console.log('✅ OpenAI configured successfully');
    }
}
async function configureClaude(configManager, config) {
    console.log('\n🔑 Configure Anthropic Claude');
    const apiKey = await configManager.promptForInput('Enter Anthropic API Key: ', true);
    if (apiKey) {
        config.ANTHROPIC_API_KEY = apiKey;
        config.AI_PROVIDER = 'claude';
        await configManager.saveConfig(config);
        console.log('✅ Anthropic Claude configured successfully');
    }
}
async function configureGemini(configManager, config) {
    console.log('\n🔑 Configure Google Gemini');
    const apiKey = await configManager.promptForInput('Enter Google API Key: ', true);
    if (apiKey) {
        config.GEMINI_API_KEY = apiKey;
        config.AI_PROVIDER = 'gemini';
        await configManager.saveConfig(config);
        console.log('✅ Google Gemini configured successfully');
    }
}
async function configureQwen(configManager, config) {
    console.log('\n🔑 Configure Qwen/DashScope');
    const apiKey = await configManager.promptForInput('Enter DashScope API Key: ', true);
    if (apiKey) {
        config.DASHSCOPE_API_KEY = apiKey;
        config.AI_PROVIDER = 'qwen';
        await configManager.saveConfig(config);
        console.log('✅ Qwen/DashScope configured successfully');
    }
}
async function configureCustomEndpoints(configManager, config) {
    console.log('\n🔧 Configure Custom Endpoints');
    console.log('Leave empty to keep current value or clear');
    const anthropicUrl = await configManager.promptForInput(`Anthropic Base URL (current: ${config.ANTHROPIC_BASE_URL || 'default'}): `);
    const openaiUrl = await configManager.promptForInput(`OpenAI Base URL (current: ${config.OPENAI_BASE_URL || 'default'}): `);
    if (anthropicUrl !== undefined) {
        config.ANTHROPIC_BASE_URL = anthropicUrl || undefined;
    }
    if (openaiUrl !== undefined) {
        config.OPENAI_BASE_URL = openaiUrl || undefined;
    }
    await configManager.saveConfig(config);
    console.log('✅ Custom endpoints configured');
}
async function resetConfig() {
    const configManager = new ConfigManager();
    const confirm = await configManager.promptForInput('⚠️  Are you sure you want to reset all configuration? (yes/no): ');
    if (confirm.toLowerCase() === 'yes') {
        await configManager.saveConfig({});
        console.log('✅ Configuration reset successfully');
    }
    else {
        console.log('❌ Reset cancelled');
    }
}
async function main() {
    console.log('🔧 MCP Mega-Tool Configuration');
    console.log('==============================');
    const configManager = new ConfigManager();
    while (true) {
        console.log('\nOptions:');
        console.log('1. Show current configuration');
        console.log('2. Configure AI provider');
        console.log('3. Reset configuration');
        console.log('0. Exit');
        const choice = await configManager.promptForInput('\nSelect option (0-3): ');
        switch (choice) {
            case '1':
                await showCurrentConfig();
                break;
            case '2':
                await configureProvider();
                break;
            case '3':
                await resetConfig();
                break;
            case '0':
                console.log('👋 Goodbye!');
                process.exit(0);
            default:
                console.log('❌ Invalid choice. Please select 0-3.');
        }
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        logger.error({ error }, 'Configuration CLI error');
        process.exit(1);
    });
}
export { ConfigManager };
//# sourceMappingURL=config.js.map
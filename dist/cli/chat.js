#!/usr/bin/env node
import "dotenv/config";
import { createInterface } from "node:readline";
import { SimpleAIProvider, OpenAIProvider, ClaudeProvider, GeminiProvider, QwenProvider, DeepSeekProvider } from "../modules/aiEvals.js";
import { ConfigManager } from "./config.js";
import { logger } from "../shared/logger.js";
class ChatInterface {
    rl;
    provider = null;
    conversation = [];
    configManager;
    constructor() {
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '💬 You: '
        });
        this.configManager = new ConfigManager();
        // Handle Ctrl+C gracefully
        this.rl.on('SIGINT', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }
    async initialize() {
        console.log('🤖 MCP Mega-Tool Chat Interface');
        console.log('===============================');
        console.log('Type "help" for commands, "exit" to quit, Ctrl+C to exit anytime\n');
        await this.selectProvider();
        this.startChat();
    }
    async selectProvider() {
        const config = await this.configManager.loadConfig();
        const availableProviders = [
            {
                name: 'Simple (Local heuristic - no API key needed)',
                key: 'simple',
                provider: () => new SimpleAIProvider()
            },
            {
                name: 'OpenAI (GPT-4, GPT-3.5)',
                key: 'openai',
                provider: () => {
                    const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
                    if (!apiKey) {
                        console.log('❌ OpenAI API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    const baseURL = config.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
                    return new OpenAIProvider(apiKey, baseURL);
                }
            },
            {
                name: 'Anthropic Claude',
                key: 'claude',
                provider: () => {
                    const apiKey = config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
                    if (!apiKey) {
                        console.log('❌ Anthropic API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    return new ClaudeProvider(apiKey);
                }
            },
            {
                name: 'Google Gemini',
                key: 'gemini',
                provider: () => {
                    const apiKey = config.GEMINI_API_KEY || config.GOOGLE_API_KEY ||
                        process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
                    if (!apiKey) {
                        console.log('❌ Google API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    return new GeminiProvider(apiKey);
                }
            },
            {
                name: 'Qwen/DashScope',
                key: 'qwen',
                provider: () => {
                    const apiKey = config.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY;
                    if (!apiKey) {
                        console.log('❌ DashScope API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    return new QwenProvider(apiKey);
                }
            },
            {
                name: 'DeepSeek Coder',
                key: 'deepseek',
                provider: () => {
                    const apiKey = config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
                    if (!apiKey) {
                        console.log('❌ DeepSeek API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    return new DeepSeekProvider(apiKey);
                }
            }
        ];
        // Try to use configured default provider first
        if (config.AI_PROVIDER) {
            const defaultProvider = availableProviders.find(p => p.key === config.AI_PROVIDER);
            if (defaultProvider) {
                const providerInstance = defaultProvider.provider();
                if (providerInstance) {
                    this.provider = providerInstance;
                    console.log(`🎯 Using configured provider: ${defaultProvider.name}`);
                    return;
                }
            }
        }
        // Show provider selection menu
        console.log('\n🤖 Select AI Provider:');
        availableProviders.forEach((provider, index) => {
            console.log(`${index + 1}. ${provider.name}`);
        });
        const choice = await this.promptForInput(`\nSelect provider (1-${availableProviders.length}): `);
        const selectedIndex = parseInt(choice) - 1;
        if (selectedIndex >= 0 && selectedIndex < availableProviders.length) {
            const selected = availableProviders[selectedIndex];
            const providerInstance = selected.provider();
            if (providerInstance) {
                this.provider = providerInstance;
                console.log(`✅ Selected: ${selected.name}`);
            }
            else {
                console.log('❌ Provider not available. Falling back to Simple provider.');
                this.provider = new SimpleAIProvider();
            }
        }
        else {
            console.log('❌ Invalid selection. Using Simple provider.');
            this.provider = new SimpleAIProvider();
        }
    }
    async promptForInput(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
    startChat() {
        console.log(`\n💬 Chat started with ${this.provider?.name || 'Unknown Provider'}`);
        console.log('Type your message and press Enter. Type "help" for commands.\n');
        this.rl.prompt();
        this.rl.on('line', async (input) => {
            const message = input.trim();
            if (!message) {
                this.rl.prompt();
                return;
            }
            await this.handleUserInput(message);
        });
    }
    async handleUserInput(input) {
        const command = input.toLowerCase();
        switch (command) {
            case 'help':
                this.showHelp();
                break;
            case 'clear':
                this.clearConversation();
                break;
            case 'history':
                this.showHistory();
                break;
            case 'provider':
                await this.changeProvider();
                break;
            case 'export':
                await this.exportConversation();
                break;
            case 'exit':
            case 'quit':
                console.log('👋 Goodbye!');
                process.exit(0);
            default:
                await this.sendMessage(input);
        }
        this.rl.prompt();
    }
    showHelp() {
        console.log('\n📚 Available Commands:');
        console.log('======================');
        console.log('help     - Show this help message');
        console.log('clear    - Clear conversation history');
        console.log('history  - Show conversation history');
        console.log('provider - Change AI provider');
        console.log('export   - Export conversation to file');
        console.log('exit     - Exit the chat');
        console.log('quit     - Exit the chat');
        console.log('\nJust type your message to chat with the AI!\n');
    }
    clearConversation() {
        this.conversation = [];
        console.log('✅ Conversation history cleared.\n');
    }
    showHistory() {
        if (this.conversation.length === 0) {
            console.log('📝 No conversation history yet.\n');
            return;
        }
        console.log('\n📝 Conversation History:');
        console.log('========================');
        this.conversation.forEach((msg, index) => {
            const time = msg.timestamp.toLocaleTimeString();
            const role = msg.role === 'user' ? '👤 You' : '🤖 AI';
            console.log(`[${time}] ${role}: ${msg.content}`);
        });
        console.log('');
    }
    async changeProvider() {
        console.log('\n🔄 Changing provider...');
        await this.selectProvider();
        console.log('✅ Provider changed. Conversation history preserved.\n');
    }
    async exportConversation() {
        if (this.conversation.length === 0) {
            console.log('❌ No conversation to export.\n');
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `chat-export-${timestamp}.json`;
        try {
            const { writeFile } = await import('node:fs/promises');
            const exportData = {
                provider: this.provider?.name || 'Unknown',
                timestamp: new Date().toISOString(),
                messages: this.conversation
            };
            await writeFile(filename, JSON.stringify(exportData, null, 2));
            console.log(`✅ Conversation exported to ${filename}\n`);
        }
        catch (error) {
            console.log(`❌ Failed to export conversation: ${error}\n`);
        }
    }
    async sendMessage(userMessage) {
        if (!this.provider) {
            console.log('❌ No AI provider available.');
            return;
        }
        // Add user message to conversation
        const userMsg = {
            role: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        this.conversation.push(userMsg);
        console.log('🤖 AI is thinking...');
        try {
            // For now, we'll use the analyze method with a mock test result
            // In a real implementation, you might want to add a dedicated chat method to the providers
            const mockTestResult = {
                passed: 0,
                failed: 0,
                skipped: 0,
                durationMs: 0,
                raw: { userMessage } // Pass the user message through
            };
            const response = await this.provider.analyze({ testResults: mockTestResult });
            // Extract a meaningful response from the AI analysis
            let aiResponse = 'I understand your message, but I\'m currently optimized for code analysis.';
            if (response.suggestions && response.suggestions.length > 0) {
                aiResponse = response.suggestions.map(s => s.description).join('\n');
            }
            else if (response.patterns && response.patterns.length > 0) {
                aiResponse = response.patterns.join('\n');
            }
            else if (response.rootCauses && response.rootCauses.length > 0) {
                aiResponse = response.rootCauses.join('\n');
            }
            // For Simple provider, create a basic response
            if (this.provider instanceof SimpleAIProvider) {
                aiResponse = this.generateSimpleResponse(userMessage);
            }
            const aiMsg = {
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            };
            this.conversation.push(aiMsg);
            console.log(`\n🤖 ${this.provider.name}: ${aiResponse}\n`);
        }
        catch (error) {
            console.log(`❌ Error getting AI response: ${error}\n`);
            logger.error({ error }, 'Chat AI error');
        }
    }
    generateSimpleResponse(userMessage) {
        const message = userMessage.toLowerCase();
        if (message.includes('hello') || message.includes('hi')) {
            return 'Hello! I\'m a simple AI assistant. How can I help you today?';
        }
        if (message.includes('help')) {
            return 'I can help you with basic questions and conversations. I\'m a simple local AI that doesn\'t require API keys.';
        }
        if (message.includes('test')) {
            return 'I can help analyze test results and suggest improvements for your code testing strategy.';
        }
        if (message.includes('code')) {
            return 'I can assist with code analysis, formatting, and basic development questions.';
        }
        if (message.includes('thank')) {
            return 'You\'re welcome! Is there anything else I can help you with?';
        }
        if (message.includes('bye') || message.includes('goodbye')) {
            return 'Goodbye! Feel free to chat with me anytime.';
        }
        // Default response
        return `I understand you said: "${userMessage}". As a simple AI, I can help with basic questions about testing, code analysis, and development. What would you like to know?`;
    }
    close() {
        this.rl.close();
    }
}
async function main() {
    const chat = new ChatInterface();
    try {
        await chat.initialize();
    }
    catch (error) {
        logger.error({ error }, 'Chat interface error');
        console.log('❌ An error occurred. Please try again.');
        process.exit(1);
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export { ChatInterface };
//# sourceMappingURL=chat.js.map
#!/usr/bin/env node
import "dotenv/config";
import { createInterface } from "node:readline";
import { SimpleAIProvider, OpenAIProvider, ClaudeProvider, GeminiProvider, QwenProvider, DeepSeekProvider } from "../modules/aiEvals.js";
import { ConfigManager } from "./config.js";
import { ToolCaller } from "../modules/toolCalling.js";
import { logger } from "../shared/logger.js";
class EnhancedChatInterface {
    rl;
    provider = null;
    conversation = [];
    configManager;
    toolCaller;
    toolsEnabled = true;
    constructor() {
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '💬 You: '
        });
        this.configManager = new ConfigManager();
        this.toolCaller = new ToolCaller(process.cwd());
        // Handle Ctrl+C gracefully
        this.rl.on('SIGINT', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }
    async initialize() {
        console.log('🤖 MCP Mega-Tool Enhanced Chat Interface');
        console.log('========================================');
        console.log('🔧 Tool-calling enabled - AI can interact with your codebase!');
        console.log('Type "help" for commands, "exit" to quit, Ctrl+C to exit anytime\n');
        await this.toolCaller.initialize();
        await this.selectProvider();
        // Add system prompt with tool information
        if (this.provider && this.toolsEnabled) {
            const systemPrompt = this.toolCaller.getSystemPrompt();
            this.conversation.push({
                role: 'system',
                content: systemPrompt,
                timestamp: new Date()
            });
        }
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
                name: 'OpenAI (GPT-4o, GPT-5 when available)',
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
                name: 'Anthropic Claude (3.5 Sonnet, Claude 4 when available)',
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
                name: 'Google Gemini (2.0 Flash, Gemini 2.5 when available)',
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
                name: 'Qwen/DashScope (Qwen2.5-Coder, Qwen-3 when available)',
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
                name: 'DeepSeek Coder (Latest coding-optimized models)',
                key: 'deepseek',
                provider: () => {
                    const apiKey = config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
                    if (!apiKey) {
                        console.log('❌ DeepSeek API key not configured. Run "mcp config" to set it up.');
                        return null;
                    }
                    const baseURL = config.DEEPSEEK_BASE_URL || process.env.DEEPSEEK_BASE_URL;
                    return new DeepSeekProvider(apiKey, undefined, baseURL);
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
        console.log(`\n💬 Enhanced chat started with ${this.provider?.name || 'Unknown Provider'}`);
        console.log('🔧 Tool calling enabled - AI can interact with your codebase!');
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
            case 'tools':
                this.toggleTools();
                break;
            case 'toollist':
                this.showAvailableTools();
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
        console.log('help      - Show this help message');
        console.log('clear     - Clear conversation history');
        console.log('history   - Show conversation history');
        console.log('provider  - Change AI provider');
        console.log('tools     - Toggle tool calling on/off');
        console.log('toollist  - Show available tools');
        console.log('export    - Export conversation to file');
        console.log('exit      - Exit the chat');
        console.log('quit      - Exit the chat');
        console.log('\n🔧 Tool Calling Features:');
        console.log('- AI can read and write files');
        console.log('- Create git branches and commits');
        console.log('- Run tests and format code');
        console.log('- Search and analyze codebase');
        console.log('- Get project structure info');
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
            let role = '🤖 AI';
            if (msg.role === 'user')
                role = '👤 You';
            else if (msg.role === 'system')
                role = '⚙️  System';
            else if (msg.role === 'tool')
                role = '🔧 Tool';
            console.log(`[${time}] ${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
            if (msg.toolCall) {
                console.log(`    🔧 Tool: ${msg.toolCall.name}(${JSON.stringify(msg.toolCall.parameters)})`);
                if (msg.toolCall.result) {
                    console.log(`    📊 Result: ${msg.toolCall.result.success ? '✅' : '❌'} ${msg.toolCall.result.output || msg.toolCall.result.error}`);
                }
            }
        });
        console.log('');
    }
    async changeProvider() {
        console.log('\n🔄 Changing provider...');
        await this.selectProvider();
        console.log('✅ Provider changed. Conversation history preserved.\n');
    }
    toggleTools() {
        this.toolsEnabled = !this.toolsEnabled;
        console.log(`🔧 Tool calling ${this.toolsEnabled ? 'enabled' : 'disabled'}.\n`);
    }
    showAvailableTools() {
        const tools = this.toolCaller.getAvailableTools();
        console.log('\n🔧 Available Tools:');
        console.log('==================');
        const categories = {
            'Git Operations': ['create_branch', 'switch_branch', 'get_current_branch', 'get_git_status', 'commit_changes', 'get_git_log'],
            'File Operations': ['read_file', 'write_file', 'list_directory', 'search_codebase'],
            'Testing & Quality': ['run_tests', 'format_code'],
            'Project Info': ['get_project_structure', 'get_package_info']
        };
        Object.entries(categories).forEach(([category, toolNames]) => {
            console.log(`\n${category}:`);
            toolNames.forEach(toolName => {
                const tool = tools.find(t => t.name === toolName);
                if (tool) {
                    console.log(`  ${toolName.padEnd(20)} - ${tool.description}`);
                }
            });
        });
        console.log('');
    }
    async exportConversation() {
        if (this.conversation.length === 0) {
            console.log('❌ No conversation to export.\n');
            return;
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `enhanced-chat-export-${timestamp}.json`;
        try {
            const { writeFile } = await import('node:fs/promises');
            const exportData = {
                provider: this.provider?.name || 'Unknown',
                toolsEnabled: this.toolsEnabled,
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
            // For enhanced chat, we'll simulate tool calling by checking if the message contains tool-related keywords
            let aiResponse = await this.generateEnhancedResponse(userMessage);
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
            logger.error({ error }, 'Enhanced chat AI error');
        }
    }
    async generateEnhancedResponse(userMessage) {
        if (!this.provider || !this.toolsEnabled) {
            return this.generateBasicResponse(userMessage);
        }
        // Check if the message suggests tool usage
        const toolKeywords = [
            'read file', 'show me', 'what is in', 'check file', 'look at',
            'create branch', 'git', 'commit', 'branch',
            'run tests', 'test', 'format', 'lint',
            'project structure', 'list files', 'directory', 'search for',
            'package.json', 'dependencies', 'scripts'
        ];
        const shouldUseTool = toolKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
        if (shouldUseTool) {
            return await this.handleToolSuggestedMessage(userMessage);
        }
        return this.generateBasicResponse(userMessage);
    }
    async handleToolSuggestedMessage(userMessage) {
        const message = userMessage.toLowerCase();
        // Simple tool suggestion logic
        if (message.includes('read file') || message.includes('show me') || message.includes('what is in')) {
            const fileMatch = userMessage.match(/(?:read|show|look at|check)\s+(?:file\s+)?([^\s]+\.[a-zA-Z]+)/i);
            if (fileMatch) {
                const filePath = fileMatch[1];
                const result = await this.toolCaller.executeTool('read_file', { filePath });
                if (result.success && result.data) {
                    return `I read the file ${filePath}:\n\n\`\`\`\n${result.data.content.substring(0, 1000)}${result.data.content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``;
                }
                else {
                    return `I tried to read ${filePath} but encountered an error: ${result.error}`;
                }
            }
        }
        if (message.includes('project structure') || message.includes('list files')) {
            const result = await this.toolCaller.executeTool('get_project_structure', {});
            if (result.success) {
                return `Here's the project structure:\n\n\`\`\`json\n${JSON.stringify(result.data.structure, null, 2)}\n\`\`\``;
            }
        }
        if (message.includes('run tests') || message.includes('test')) {
            const result = await this.toolCaller.executeTool('run_tests', {});
            if (result.success) {
                return `Test results: ${result.output}\n\nDetails: ${JSON.stringify(result.data, null, 2)}`;
            }
            else {
                return `Failed to run tests: ${result.error}`;
            }
        }
        if (message.includes('current branch') || message.includes('git status')) {
            const branchResult = await this.toolCaller.executeTool('get_current_branch', {});
            const statusResult = await this.toolCaller.executeTool('get_git_status', {});
            let response = '';
            if (branchResult.success) {
                response += `Current branch: ${branchResult.data.branch}\n`;
            }
            if (statusResult.success) {
                response += `Git status: ${statusResult.data.changes.length} changes found\n`;
                statusResult.data.changes.forEach((change) => {
                    response += `  ${change.status} ${change.file}\n`;
                });
            }
            return response || 'Unable to get git information.';
        }
        if (message.includes('package.json')) {
            const result = await this.toolCaller.executeTool('get_package_info', {});
            if (result.success) {
                return `Package information:\n- Name: ${result.data.name}\n- Version: ${result.data.version}\n- Description: ${result.data.description}\n\nScripts: ${Object.keys(result.data.scripts || {}).join(', ')}`;
            }
        }
        // If we can't determine a specific tool, provide a helpful response
        return `I can help you with various development tasks using tools! Try asking me to:
- "read file package.json" - to read a specific file
- "show me the project structure" - to see the project layout
- "run tests" - to execute your test suite
- "what's the current branch" - to check git status
- "search for [pattern]" - to search the codebase

What would you like me to help you with?`;
    }
    generateBasicResponse(userMessage) {
        const message = userMessage.toLowerCase();
        if (message.includes('hello') || message.includes('hi')) {
            return 'Hello! I\'m an enhanced AI assistant with tool-calling capabilities. I can interact with your codebase, run tests, manage git operations, and much more. What would you like me to help you with?';
        }
        if (message.includes('help')) {
            return 'I can help you with development tasks using various tools. I can read/write files, manage git branches, run tests, format code, and analyze your project structure. Just ask me naturally - for example, "read the package.json file" or "run the tests".';
        }
        if (message.includes('tools')) {
            return 'I have access to many development tools including git operations, file management, testing, code formatting, and project analysis. Type "toollist" to see all available tools, or just ask me to do something and I\'ll use the appropriate tools!';
        }
        // Default response for Simple provider
        if (this.provider instanceof SimpleAIProvider) {
            return `I understand you said: "${userMessage}". As an enhanced AI assistant, I can help with development tasks using tools. Even with the Simple provider, I can demonstrate tool usage. Try asking me about your project structure or to read a file!`;
        }
        // Default response for other providers
        return `I understand your message: "${userMessage}". I'm equipped with development tools and can help with coding tasks. What specific task would you like me to help you with?`;
    }
    close() {
        this.rl.close();
    }
}
async function main() {
    const chat = new EnhancedChatInterface();
    try {
        await chat.initialize();
    }
    catch (error) {
        logger.error({ error }, 'Enhanced chat interface error');
        console.log('❌ An error occurred. Please try again.');
        process.exit(1);
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
export { EnhancedChatInterface };
//# sourceMappingURL=enhancedChat.js.map
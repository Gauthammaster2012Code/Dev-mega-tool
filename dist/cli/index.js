#!/usr/bin/env node
import "dotenv/config";
import { logger } from "../shared/logger.js";
const COMMANDS = {
    config: 'Manage API keys and configuration',
    chat: 'Interactive chat with AI providers',
    'enhanced-chat': 'Enhanced chat with tool-calling capabilities',
    orchestrate: 'Run the full orchestration pipeline',
    server: 'Start the MCP server',
    help: 'Show this help message'
};
function showHelp() {
    console.log('🔧 MCP Mega-Tool CLI');
    console.log('====================');
    console.log('\nUsage: mcp <command> [options]\n');
    console.log('Available commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(12)} ${desc}`);
    });
    console.log('\nExamples:');
    console.log('  mcp config           Configure API keys');
    console.log('  mcp chat             Start basic chat interface');
    console.log('  mcp enhanced-chat    Start enhanced chat with tool calling');
    console.log('  mcp orchestrate      Run test orchestration');
    console.log('  mcp server           Start MCP server');
    console.log('  mcp help             Show this help');
    console.log('\nFor more information about a specific command, run:');
    console.log('  mcp <command> --help');
}
async function runCommand(command, args) {
    try {
        switch (command) {
            case 'config':
                // Import and run the config module
                await import('./config.js');
                break;
            case 'chat':
                const { ChatInterface } = await import('./chat.js');
                const chat = new ChatInterface();
                await chat.initialize();
                break;
            case 'enhanced-chat':
                const { EnhancedChatInterface } = await import('./enhancedChat.js');
                const enhancedChat = new EnhancedChatInterface();
                await enhancedChat.initialize();
                break;
            case 'orchestrate':
                // Import and run the orchestrate module
                await import('./orchestrate.js');
                break;
            case 'server':
                const { startServer } = await import('../index.js');
                console.log('🚀 Starting MCP Server...');
                const server = await startServer();
                console.log('✅ MCP Server started successfully');
                // Keep the process alive
                process.on('SIGINT', () => {
                    console.log('\n🛑 Shutting down server...');
                    server.close();
                    process.exit(0);
                });
                break;
            case 'help':
            case '--help':
            case '-h':
                showHelp();
                break;
            default:
                console.log(`❌ Unknown command: ${command}`);
                console.log('Run "mcp help" to see available commands.');
                process.exit(1);
        }
    }
    catch (error) {
        logger.error({ error, command }, 'CLI command error');
        console.log(`❌ Error running command "${command}": ${error}`);
        process.exit(1);
    }
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('🔧 MCP Mega-Tool CLI');
        console.log('====================');
        console.log('No command specified. Run "mcp help" to see available commands.\n');
        showHelp();
        return;
    }
    const command = args[0].toLowerCase();
    const commandArgs = args.slice(1);
    // Handle help flags
    if (commandArgs.includes('--help') || commandArgs.includes('-h')) {
        switch (command) {
            case 'config':
                console.log('🔧 MCP Config - Manage API keys and configuration');
                console.log('Usage: mcp config');
                console.log('\nInteractive configuration tool for setting up AI providers.');
                break;
            case 'chat':
                console.log('💬 MCP Chat - Interactive chat with AI providers');
                console.log('Usage: mcp chat');
                console.log('\nStart an interactive chat session with configured AI providers.');
                break;
            case 'orchestrate':
                console.log('🎭 MCP Orchestrate - Run test orchestration pipeline');
                console.log('Usage: mcp orchestrate');
                console.log('\nRun the full test → analyze → fix → verify pipeline.');
                break;
            case 'server':
                console.log('🚀 MCP Server - Start the MCP HTTP/WebSocket server');
                console.log('Usage: mcp server');
                console.log('\nStart the MCP server with HTTP and WebSocket endpoints.');
                break;
            default:
                showHelp();
        }
        return;
    }
    await runCommand(command, commandArgs);
}
// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception in CLI');
    console.log('❌ An unexpected error occurred. Check logs for details.');
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection in CLI');
    console.log('❌ An unexpected error occurred. Check logs for details.');
    process.exit(1);
});
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
//# sourceMappingURL=index.js.map
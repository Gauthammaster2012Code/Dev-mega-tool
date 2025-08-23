#!/usr/bin/env node
import "dotenv/config";
declare class EnhancedChatInterface {
    private rl;
    private provider;
    private conversation;
    private configManager;
    private toolCaller;
    private toolsEnabled;
    constructor();
    initialize(): Promise<void>;
    selectProvider(): Promise<void>;
    private promptForInput;
    private startChat;
    private handleUserInput;
    private showHelp;
    private clearConversation;
    private showHistory;
    private changeProvider;
    private toggleTools;
    private showAvailableTools;
    private exportConversation;
    private sendMessage;
    private generateEnhancedResponse;
    private handleToolSuggestedMessage;
    private generateBasicResponse;
    close(): void;
}
export { EnhancedChatInterface };
//# sourceMappingURL=enhancedChat.d.ts.map
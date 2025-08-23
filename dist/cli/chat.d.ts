#!/usr/bin/env node
import "dotenv/config";
declare class ChatInterface {
    private rl;
    private provider;
    private conversation;
    private configManager;
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
    private exportConversation;
    private sendMessage;
    private generateSimpleResponse;
    close(): void;
}
export { ChatInterface };
//# sourceMappingURL=chat.d.ts.map
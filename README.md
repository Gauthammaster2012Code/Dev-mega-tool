# MCP Mega-Tool (Local-First AI Developer Assistant)

- Node.js + TypeScript MCP server with HTTP and WebSocket
- Branch-safe Git operations via temporary branches
- Persistent rules file `.ai-tool-rules.json` for resumability
- SQLite memory for tests, fixes, AI findings, visual results
- Test orchestration (Jest/Mocha autodetect)
- Visual regression (Playwright + pixelmatch)
- AI-evals (local heuristic or external providers)
- Self-healing apply-fix loop
- IDE plugin templates (Cursor, Windsurf)
- CI/CD: GitHub Actions, GitLab, Jenkins

## Installation

### As a Dependency

Install the package in your project:

```bash
npm install @mcp-tools/mega-tool
```

### Basic Usage

```javascript
import { 
  TestRunner, 
  AIEvals, 
  SimpleAIProvider, 
  startServer,
  logger 
} from '@mcp-tools/mega-tool';

// Run tests
const testRunner = new TestRunner();
const results = await testRunner.runAll();

// Analyze with AI
const provider = new SimpleAIProvider();
const aiEvals = new AIEvals(provider);
const findings = await aiEvals.analyze({ testResults: results });

// Start the MCP server
const server = await startServer({
  repoRoot: process.cwd(),
  httpPort: 7040,
  wsPort: 7041
});
```

### TypeScript Support

Full TypeScript support with type definitions:

```typescript
import type { 
  TestRunResult, 
  AIProvider, 
  TaskKind, 
  Logger 
} from '@mcp-tools/mega-tool';
```

### Available Exports

#### Core Classes
- `TestRunner` - Test orchestration (Jest/Mocha autodetect)
- `AIEvals` - AI analysis and evaluation
- `GitOps` - Git operations and branch management
- `Formatter` - Code formatting utilities
- `VisualRunner` - Visual regression testing
- `MergeResolver` - Merge conflict resolution
- `SelfHealing` - Self-healing apply-fix loop
- `Persistence` - SQLite data persistence
- `RulesFileManager` - Rules file management

#### AI Providers
- `SimpleAIProvider` - Local heuristic provider (default)
- `OpenAIProvider` - OpenAI integration (GPT-4o, GPT-5 when available)
- `GeminiProvider` - Google Gemini integration (2.0 Flash, Gemini 2.5 when available)
- `ClaudeProvider` - Anthropic Claude integration (3.5 Sonnet, Claude 4 when available)
- `QwenProvider` - Qwen integration (Qwen2.5-Coder, Qwen-3 when available)
- `DeepSeekProvider` - DeepSeek Coder integration (Latest coding-optimized models)

#### Server Functions
- `createHttpServer(repoRoot)` - Create HTTP server instance
- `createWsServer(repoRoot, port)` - Create WebSocket server instance
- `startServer(options)` - Start both HTTP and WebSocket servers

#### Utilities
- `logger` - Pino logger instance
- `createChildLogger(name)` - Create child logger
- `eventBus` - Event bus for inter-component communication
- `loadConfig(repoRoot)` - Load configuration
- `createPullRequest(params)` - GitHub PR creation
- `ToolCaller` - Tool calling interface for AI-codebase interaction

#### Tool Calling System
- **Git Operations**: Create branches, commit changes, check status
- **File Operations**: Read/write files, search codebase, list directories  
- **Testing & Quality**: Run tests, format code, lint analysis
- **Project Analysis**: Get structure, dependencies, package info

#### Types
- `TestRunResult` - Test execution results
- `AIProvider` - AI provider interface
- `TaskKind` - Task type definitions
- `TaskStatus` - Task status definitions
- `FixSuggestion` - Fix suggestion structure
- `AIEvalFindings` - AI analysis results
- `Logger` - Logger type
- `AppConfig` - Application configuration

### CLI Usage

After installation, use the CLI commands:

```bash
# Configure API keys
mcp config

# Start basic chat
mcp chat

# Start enhanced chat with tool calling
mcp enhanced-chat

# Run orchestration pipeline
mcp orchestrate

# Start MCP server
mcp server

# Show help
mcp help
```

#### CLI Features

**Configuration Management (`mcp config`)**
- Interactive setup for AI provider API keys
- Support for OpenAI, Anthropic Claude, Google Gemini, Qwen/DashScope
- Secure masked input for API keys
- Custom endpoint configuration
- Configuration stored in `.mcp-config.json` and `.env`

**Interactive Chat (`mcp chat`)**
- Real-time chat with configured AI providers
- Provider switching during conversation
- Conversation history and export
- Built-in commands: `help`, `clear`, `history`, `provider`, `export`, `exit`
- Fallback to Simple provider when no API keys configured

**Enhanced Chat (`mcp enhanced-chat`)**
- **Tool-calling capabilities** - AI can interact with your codebase
- **Git operations** - Create branches, commit changes, check status
- **File management** - Read/write files, search patterns, analyze structure
- **Testing integration** - Run tests, format code, get project info
- **Codebase awareness** - AI understands project context and structure
- **Advanced commands**: `tools`, `toollist` for tool management
- **System prompts** optimized for development tasks

### Development Scripts

For development, you can also use npm scripts:

```bash
# Run CLI commands during development
npm run cli help
npm run config
npm run chat
npm run enhanced-chat

# Run other commands
npm run orchestrate
npm start
```

### Standalone Usage

Clone and run as a standalone server:

```bash
git clone <repository-url>
cd mcp-mega-tool
npm install
npm run build
npm start
```

## Providers
Supported AI providers with latest models (choose via env):
- **Local heuristic** (default) - No API key required
- **OpenAI**: set `OPENAI_API_KEY` and optional `AI_PROVIDER=openai`
  - Models: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, GPT-5 (when available)
- **Anthropic Claude**: set `ANTHROPIC_API_KEY` and optional `AI_PROVIDER=claude`  
  - Models: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 4 (when available)
- **Google Gemini**: set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and optional `AI_PROVIDER=gemini`
  - Models: Gemini 2.0 Flash, Gemini 1.5 Pro, Gemini 2.5 (when available)
- **Qwen/DashScope**: set `DASHSCOPE_API_KEY` and optional `AI_PROVIDER=qwen`
  - Models: Qwen2.5-Coder 32B, Qwen2.5 72B, Qwen-3 Coder (when available)
- **DeepSeek**: set `DEEPSEEK_API_KEY` and optional `AI_PROVIDER=deepseek`
  - Models: DeepSeek Coder, DeepSeek Chat, DeepSeek Reasoner

Optional overrides:
- `ANTHROPIC_BASE_URL` for Claude custom endpoints
- `OPENAI_BASE_URL` for OpenAI-compatible endpoints (Ollama/vLLM)
- `DEEPSEEK_BASE_URL` for DeepSeek custom endpoints

## Setup

- Node.js >= 18
- npm ci
- npm run build
- npm run dev

Env vars:
- MCP_HTTP_PORT=7040
- MCP_WS_PORT=7041
- OPENAI_API_KEY=... (optional)
- GEMINI_API_KEY=... (optional)
- ANTHROPIC_API_KEY=... (optional)
- DASHSCOPE_API_KEY=... (optional)
- DEEPSEEK_API_KEY=... (optional)
- AI_PROVIDER=openai|gemini|claude|qwen|deepseek (optional)
- ORCH_VISUAL_URL=http://localhost:3000 (optional)

## Endpoints
- GET /health
- GET /status
- POST /run-tests
- POST /analyze
- POST /apply-fixes { suggestions: FixSuggestion[] }
- POST /format
- POST /visual { url, name }
- POST /orchestrate

## CLI Orchestrator
- npm run orchestrate (runs tests -> AI-evals -> apply suggestions -> re-run tests -> optional visual)

## Features Summary
- MCP server orchestrates tests, formatting, visual checks, AI analysis, and fixes in temp branches.
- WebSocket broadcasts status, test results, AI findings, visual results, and applied fixes.
- Rules file ensures branch-safe, resumable runs and IDE lockouts during tasks.
- Persistence layer learns from failures and fix outcomes.
- Visual regression detects UI anomalies and stores diff artifacts.
- Pluggable AI providers with local-first default and privacy-friendly keys.
- Self-healing applies code updates and verifies via re-runs before merge/PR.
- CI/CD pipelines integrate orchestrator into PR workflows.
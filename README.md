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

## Providers
Supported AI providers (choose via env):
- Local heuristic (default)
- OpenAI: set `OPENAI_API_KEY` and optional `AI_PROVIDER=openai`
- Gemini: set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and optional `AI_PROVIDER=gemini`
- Claude: set `ANTHROPIC_API_KEY` and optional `AI_PROVIDER=claude`
- Qwen: set `DASHSCOPE_API_KEY` and optional `AI_PROVIDER=qwen`

Optional overrides:
- `ANTHROPIC_BASE_URL` for Claude
- `OPENAI_BASE_URL` for OpenAI-compatible endpoints (Ollama/vLLM), set `AI_PROVIDER=openai`

## Setup

- Node.js >= 20
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
- AI_PROVIDER=openai|gemini|claude|qwen (optional)
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

## MCP JSON server and project key

MDT runs an HTTP JSON MCP endpoint at `POST /mcp` on the local server (see `src/index.ts` for HTTP port, default 7040). Access requires a project key stored in `MCP_KEY.md`.

- On install/start, MDT creates `MCP_KEY.md` in your repo root with content:

```
KEY="<64-hex-key>"
```

- The file is set to read-only (0400) for safety. If you need to rotate the key, delete the file and restart MDT, or reinstall; a new key will be generated automatically.

- Requests must include the key via header or JSON body:
  - Header: `X-MCP-Key: <64-hex-key>`
  - Body: `{ "key": "<64-hex-key>", "method": "callMDTTool", "params": { "toolName": "run_tests", "params": {} } }`

### Example: call a tool via MCP JSON

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-MCP-Key: $(sed -n 's/KEY="\([A-Fa-f0-9]*\)"/\1/p' MCP_KEY.md)" \
  http://localhost:7040/mcp \
  -d '{
    "method": "callMDTTool",
    "params": { "toolName": "analyze_codebase", "params": {} }
  }'
```

### Security notes
- The key never leaves the repository; it’s generated locally and persisted in `MCP_KEY.md`.
- Logs redact secrets.
- The MCP endpoint returns 401 for missing/invalid keys.

### Quickstart

- Initialize project config:
```bash
npm run mega-tool -- run init_project --json-params '{}'
```

- Generate tests:
```bash
npm run mega-tool -- run generate_test_cases --json-params '{"sourceFiles":["src/index.ts"]}'
```

- Run demo end-to-end:
```bash
bash ./scripts/demo-mdt.sh
```

### Install as a dependency (GitHub)

- Dev dependency (recommended alias for clean uninstall):
```bash
npm i -D mdt-mega-tool@github:Gauthammaster2012Code/Dev-mega-tool#main
```

- Dev dependency (HTTPS alias):
```bash
npm i -D mdt-mega-tool@git+https://github.com/Gauthammaster2012Code/Dev-mega-tool.git#main
```

- Production dependency:
```bash
npm i mdt-mega-tool@github:Gauthammaster2012Code/Dev-mega-tool#main
```

- Uninstall (using the alias above):
```bash
npm uninstall mdt-mega-tool
```

- If you installed without an alias (not recommended), uninstall by the package name declared in this repo (`workspace`):
```bash
npm uninstall workspace
```

- Update to latest `main` (reinstall):
```bash
npm i -D mdt-mega-tool@github:Gauthammaster2012Code/Dev-mega-tool#main
```

- Pin to a specific tag/commit:
```bash
npm i -D mdt-mega-tool@github:Gauthammaster2012Code/Dev-mega-tool#<tag-or-commit>
```

### MCP config (JSON example)

- Using built output (`dist/index.js`):
```json
{
  "mcpServers": {
    "mdt": {
      "command": "node",
      "args": [
        "./dist/index.js"
      ],
      "env": {
        "MCP_HTTP_PORT": "7040",
        "MCP_WS_PORT": "7041"
      }
    }
  }
}
```

- Using tsx in development:
```json
{
  "mcpServers": {
    "mdt": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "src/index.ts"
      ],
      "env": {
        "MCP_HTTP_PORT": "7040",
        "MCP_WS_PORT": "7041"
      }
    }
  }
}
```

Note: The HTTP JSON endpoint at `/mcp` requires the project key from `MCP_KEY.md` for all methods except `key_verify`. Obtain the key by reading `MCP_KEY.md` and include it as `X-MCP-Key` header when calling the endpoint directly. IDEs that only use the server process (command/args) don’t need to pass headers explicitly.
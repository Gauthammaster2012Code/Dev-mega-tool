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
- MDT_PW_SKIP=1 (optional; skip Playwright browser actions in generated specs)

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

## Playwright and Puppeteer Dependencies

- Playwright: this project uses `playwright-core`. To run browsers locally, install at least one browser engine or the full `playwright` package:
  - `npm i -D playwright` (installs Chromium/WebKit/Firefox)
  - Or install a single engine via `npx playwright install chromium`
- Puppeteer: provide `CHROME_PATH` or `PUPPETEER_EXECUTABLE_PATH` to a Chrome/Chromium executable.

Generated specs include cleanup and retries. Set `MDT_PW_SKIP=1` to skip browser actions in headless environments.

### Windows tsx note
If you install from git, the CLI may run via tsx. Ensure `tsx` is installed locally or use the compiled CLI:
- `npm i -D tsx` then `npx mdt --help`
- Or build first: `npm ci && npm run build && node bin/mdt.js --help`
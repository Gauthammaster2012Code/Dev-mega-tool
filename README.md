# MCP Mega-Tool (Local-First AI Developer Assistant)

- Node.js + TypeScript MCP server with HTTP and WebSocket
- Branch-safe Git operations via temporary branches
- Test orchestration (Jest/Mocha autodetect)
- Visual regression (Playwright + pixelmatch)
- AI-evals (local heuristic or OpenAI with user key)
- Self-healing apply-fix loop and persistent memory (SQLite)

## Setup

- Node.js >= 20
- npm ci
- npm run build
- npm run dev

Env vars:
- MCP_HTTP_PORT=7040
- MCP_WS_PORT=7041
- OPENAI_API_KEY=... (optional)
- ORCH_VISUAL_URL=http://localhost:3000 (optional)

## Endpoints
- GET /health
- GET /status
- POST /run-tests
- POST /analyze
- POST /apply-fixes { suggestions: FixSuggestion[] }
- POST /format
- POST /visual { url, name }

## CLI Orchestrator
- npm run orchestrate (runs tests -> AI-evals -> apply suggestions -> re-run tests -> optional visual)

## CI/CD
- GitHub Actions: .github/workflows/mcp.yml
- GitLab CI: .gitlab-ci.yml
- Jenkins: Jenkinsfile

## IDE Plugins
Templates in src/ide-plugins/ demonstrate connecting to MCP server via WS + HTTP.
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
# AGENTS.md — loom-research

Source-grounded research quality tool. A Node.js CLI that fetches web sources, extracts readable content, routes to an AI backend with strict quality rules, and produces compliance-checked research reports.

## Stack

- Runtime: Node.js (ESM, ES2024 target)
- Language: TypeScript (strict mode, NodeNext module resolution)
- CLI: Commander.js
- HTML extraction: @mozilla/readability + jsdom
- AI: OpenAI SDK (BYOK), Claude CLI, or Codex CLI
- Build: `tsc` → `dist/`

## Project Structure

```
src/
  cli.ts                    Entry point. Commander setup, config subcommand, research pipeline
  lib/
    source-fetcher.ts       Fetch URLs, extract readable text via Readability
    prompt-builder.ts       Assemble system prompt + sources into research task
    ai-router.ts            3-tier backend detection: claude → codex → BYOK API
    output-processor.ts     Compliance checker (evidence tags, conflicts, source refs)
    quality-rules.ts        Quality rule constants and output template
    config.ts               Local config CRUD, credential resolution
prompts/
  system-prompt.md          AI system prompt with quality rules and output format
```

## Pipeline

1. **Fetch** — `fetchSources(urls)` fetches each URL, parses HTML with JSDOM, extracts text with Readability. Each source gets an ID: S1, S2, etc.
2. **Build prompt** — `buildPrompt(topic, sources)` loads `prompts/system-prompt.md`, formats sources with IDs, appends the research task.
3. **Route to AI** — `routeToAI(prompt, sources)` tries claude CLI, then codex CLI, then BYOK API. Returns `{ content, model, backend }`.
4. **Process output** — `processOutput(content)` checks compliance: evidence tags present, conflict section exists, [待验证] count, source reference count. Appends compliance report.

## Config System

Local file-based config, sandbox-scoped to the tool:

- Windows: `%APPDATA%/loom/config.json`
- Unix: `~/.loom/config.json`

Keys: `apiKey`, `apiBase`, `model`. Resolution priority: explicit CLI flag > env var (`LOOM_API_KEY`, `LOOM_API_BASE`, `LOOM_MODEL`) > config file.

Commands: `config set <key> <value>`, `config get <key>`, `config delete <key>`, `config list`, `config reset`.

## Key Design Decisions

- **Quality rules are not configurable.** The 6 core rules and 9 red lines are hardcoded in `prompts/system-prompt.md`. This is intentional — research integrity doesn't have settings.
- **3-tier backend detection.** Local CLIs (claude, codex) are preferred over API calls because they're already authenticated and don't need key management.
- **Claude CLI uses temp CLAUDE.md.** Windows command-line length limit means the prompt can't go through `-p`. Instead, the full prompt is written to a temp `CLAUDE.md` that Claude Code auto-loads.
- **Compliance is a hard check, not a suggestion.** `output-processor.ts` counts evidence tags, source references, and [待验证] markers. The compliance report is always appended.

## Development

```bash
pnpm install
pnpm dev -- research "topic" -s https://example.com    # run via tsx
pnpm build                                               # tsc → dist/
```

No test framework set up yet. Manual verification: run the CLI with real URLs and check the compliance report at the bottom of output.

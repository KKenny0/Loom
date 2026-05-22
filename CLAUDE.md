# CLAUDE.md — loom-research

Source-grounded research CLI. Fetches URLs, extracts readable text, sends to an AI backend with quality rules, and produces a compliance-checked report.

## Architecture

```
CLI (src/cli.ts)
  ├── fetchSources()     ← source-fetcher.ts (Readability + JSDOM)
  ├── buildPrompt()      ← prompt-builder.ts + prompts/system-prompt.md
  ├── routeToAI()        ← ai-router.ts (3-tier: claude CLI → codex CLI → BYOK API)
  └── processOutput()    ← output-processor.ts (compliance check)
```

Config lives in `src/lib/config.ts` — sandbox-style local file at `%APPDATA%/loom/config.json` (Win) or `~/.loom/config.json` (Unix). Credential priority: CLI flag > env var > config file.

## Commands

```bash
pnpm dev -- research "topic" -s <url1> <url2>     # run research
pnpm dev -- config set apiKey <key>                # BYOK setup
pnpm dev -- config list                            # show config (apiKey masked)
pnpm dev -- config reset                           # wipe all config
```

## Conventions

- ESM only (`"type": "module"`, NodeNext module resolution)
- TS strict mode, ES2024 target
- No test framework yet — verify manually with `pnpm dev`
- Build: `tsc` → `dist/`

## Quality Rules Are Sacred

The 6 core rules and 9 red lines in `prompts/system-prompt.md` define what this tool produces. Do not relax, reorder, or summarize them. If a change touches quality rules, the output template, or compliance checks, it must preserve the contract: source citations (S1, S2), evidence tags ([Strong]/[Moderate]/[Weak]/[Contested]), conflict section, and [待验证] markers.

## AI Backend Router

`ai-router.ts` tries backends in order: `claude` CLI → `codex` CLI → BYOK OpenAI-compatible API. The Claude CLI path writes a temporary `CLAUDE.md` in a temp directory because Windows has command-line length limits — the model reads the file instead of receiving the prompt via `-p`. Codex CLI writes source files to a temp `sources/` dir. Both clean up after themselves.

Do not change the detection order without reason — it's intentional that local CLIs take priority over API calls.

## Config Security

- `config list` and `config get` always mask apiKey as `***`
- Config directory is tool-scoped, not global — `config reset` deletes the entire directory
- `resolveApiKey()` in config.ts never logs the key
- Do not add logging that prints raw API keys

## Commander Pattern

The research command uses `program.command('research', { isDefault: true, hidden: true })` because a root-level required positional argument (`<topic>`) conflicts with subcommands — Commander would eat `config` as the topic string. Do not flatten this back to the root program.

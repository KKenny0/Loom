# Loom

**Source-grounded comparison and verification.** Give it a topic — it finds sources, compares them, and shows you where they agree, disagree, or leave gaps. Give it a text and sources — it checks every claim.

No AI hallucination smoothing. Every claim cites a source. Every conflict is named.

## Try it now (no install)

**[Source Ground on ChatGPT](https://chatgpt.com/g/g-6a0ea2550d6c81919007109aad61a089-source)** — the same quality methodology, zero setup. Paste URLs, get a structured comparison.

## What it does

**Compare** — give a topic (and optionally source URLs), get a two-layer output:
- **Card** (stdout) — quick scan: agreements, disagreements, gaps, bottom line
- **Report** (file or `--full`) — deep dive with findings, conflicts, inferences, compliance check

**Verify** — give a text file and source URLs, get a claim-by-claim verification: which claims are supported, contradicted, or unsupported.

## Install

```bash
git clone <repo-url> && cd Loom
pnpm install
pnpm build
```

Run without building:

```bash
pnpm dev -- compare "React vs Vue for enterprise" -s <url1> <url2>
```

## Usage

### Compare

```bash
# Auto-source: AI searches for sources (needs Claude CLI or Codex CLI)
loom compare "Electric vehicle market trends 2025"

# Manual sources
loom compare "React vs Vue for enterprise" \
  -s https://example.com/article1 https://example.com/article2

# Card → stdout, full report → file
loom compare "Topic" -s <url1> <url2> -o report.md

# Card + report → stdout
loom compare "Topic" -s <url1> <url2> --full

# Shortcut (compare is the default command)
loom "React vs Vue for enterprise"
```

### Verify

```bash
# Verify a file against sources
loom verify report.md -s https://example.com/article1 https://example.com/article2

# Verify from stdin
cat draft.txt | loom verify - -s <url1> <url2>

# Output to file
loom verify report.md -s <url1> <url2> -o check.md
```

### Config

```bash
loom config set apiKey sk-your-key       # BYOK API key
loom config set apiBase https://api.openai.com/v1
loom config set model gpt-4o
loom config list                          # show all (apiKey masked)
loom config reset                         # wipe all config
```

## AI backends

Loom detects backends automatically:

| Priority | Backend | Requirement |
|----------|---------|-------------|
| 1 | Claude CLI | `claude` on PATH |
| 2 | Codex CLI | `codex` on PATH |
| 3 | BYOK API | API key configured |

CLI backends get web search tools in auto-source mode. No API key needed if a CLI is found.

Config location: `%APPDATA%\loom\config.json` (Windows) or `~/.loom/config.json` (macOS/Linux).

Credential resolution: `--api-key` flag > `LOOM_API_KEY` env var > config file.

## Quality rules

These are hardcoded, not configurable. Research integrity doesn't have settings.

1. **Cite sources on every claim** — S1, S2, etc. No source? Mark it `[待验证]`.
2. **Preserve conflicts** — sources disagree? Say so explicitly. No smoothing.
3. **Tag evidence weight** — `[Strong]`, `[Moderate]`, `[Weak]`, or `[Contested]`.
4. **Mark inferences** — "the source says" vs "I'm inferring".
5. **Admit uncertainty** — thin evidence gets called thin.
6. **Pre-delivery scan** — check that no disagreements were hidden.

Compliance is verified programmatically, not by AI self-report.

## Architecture

```
CLI (src/cli.ts)
  ├── fetchSources()       ← source-fetcher.ts (Readability + JSDOM)
  ├── buildComparePrompt() / buildVerifyPrompt()  ← prompt-builder.ts
  ├── routeToAI()          ← ai-router.ts (claude CLI → codex CLI → BYOK API)
  └── processOutput()      ← output-processor.ts (card/report split + compliance)
```

```
src/
├── cli.ts                     Commander entry point
├── lib/
│   ├── ai-router.ts           3-tier backend detection
│   ├── config.ts              Local config CRUD
│   ├── output-processor.ts    Dual-layer output + compliance checks
│   ├── prompt-builder.ts      Prompt assembly with quality rules
│   ├── quality-rules.ts       Core rules, red lines, evidence tags
│   └── source-fetcher.ts      URL fetch + Readability extraction
└── prompts/
    ├── compare-prompt.md      Compare mode system prompt
    └── verify-prompt.md       Verify mode system prompt
```

## License

ISC

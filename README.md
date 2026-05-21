# Loom

A CLI that fetches web sources, sends them to an AI, and enforces research quality rules on the output. The result is a structured report with evidence tags, source citations, and a compliance check.

## How it works

```
URLs ──► Source Fetcher ──► Prompt Builder ──► AI Router ──► Output Processor
          (Readability)     (quality rules +    (claude /      (evidence tags,
                             sources + topic)    codex /        compliance
                                                 BYOK API)      report)
```

## Install

```bash
git clone <repo-url> && cd Loom
pnpm install
pnpm build
```

Run locally without building:

```bash
pnpm dev <topic> -s <url1> <url2> ...
```

## Usage

```bash
# Basic — prints to stdout
loom-research "Electric vehicle market trends 2025" \
  -s https://example.com/article1 \
     https://example.com/article2

# Save to file
loom-research "Electric vehicle market trends 2025" \
  -s https://example.com/article1 \
  -o report.md

# Override model (BYOK mode only)
loom-research "Topic" -s <url> -m gpt-4o-mini
```

## AI backends

Loom detects available AI backends automatically, in this order:

| Priority | Backend | Requirement |
|----------|---------|-------------|
| 1 | Claude CLI | `claude` installed and on PATH |
| 2 | Codex CLI | `codex` installed and on PATH |
| 3 | BYOK API | API key configured (see below) |

If a CLI is found, it's used directly. No API key needed.

### Configuring the BYOK API

When no CLI is available, Loom falls back to any OpenAI-compatible API.

```bash
# Set your API key (stored locally, not in environment variables)
loom-research config set apiKey sk-your-key-here

# Optional: change the endpoint and model
loom-research config set apiBase https://api.openai.com/v1
loom-research config set model gpt-4o
```

Config is stored at:
- **Windows**: `%APPDATA%\loom\config.json`
- **macOS/Linux**: `~/.loom/config.json`

API keys are masked in `config list` and `config get` output.

```bash
loom-research config list        # show all settings
loom-research config get apiKey  # show specific key (masked)
loom-research config delete apiKey  # remove a key
loom-research config reset       # delete all config
```

You can also pass the key inline or via environment variables. Resolution order:

1. `--api-key` CLI flag
2. `LOOM_API_KEY` environment variable
3. Local config file

## Quality rules

Every research report goes through these checks:

1. **Source citations** — every factual claim must reference a source (S1, S2, ...). Unsourced claims are marked `[待验证]`.
2. **Conflict preservation** — when sources disagree, the disagreement is stated explicitly. No smoothing.
3. **Evidence weight** — each conclusion gets a tag: `[Strong]`, `[Moderate]`, `[Weak]`, or `[Contested]`.
4. **Inference marking** — the report separates "the source says" from "I'm inferring."
5. **Uncertainty** — if evidence is thin, the report says so.
6. **Pre-delivery scan** — a final pass checks that no disagreements were hidden.

Compliance is verified by post-processing the AI output with pattern matching — not by asking the AI to self-report.

## Output structure

Every report includes:

- **Summary** — one paragraph
- **Findings** — each with source references and evidence tags
- **Conflicts & Disagreements** — who says what
- **Inferences vs Source Claims** — clearly separated
- **Confidence & Caveats** — honest assessment
- **Loom Compliance Report** — automated check results

## Architecture

```
src/
├── cli.ts                  # Commander CLI entry point
├── lib/
│   ├── ai-router.ts        # Backend detection and routing
│   ├── config.ts           # Local config management
│   ├── output-processor.ts # Compliance checks and rendering
│   ├── prompt-builder.ts   # Assembles prompt with quality rules
│   ├── quality-rules.ts    # Core rules, red lines, evidence tags
│   └── source-fetcher.ts   # URL fetching + Readability extraction
└── prompts/
    └── system-prompt.md    # Full quality instructions for the AI
```

## License

ISC

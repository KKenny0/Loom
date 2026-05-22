# Loom

**基于来源的对比与验证工具。** 给它一个话题 — 它找到来源、对比分析，告诉你哪里共识、哪里打架、哪里证据不足。给它一篇文章和来源 — 它逐条检查每个论断。

不糊弄。每个论断引用来源，每个冲突明确标注。

## 零安装试用

**[Source Ground (ChatGPT)](https://chatgpt.com/g/g-6a0ea2550d6c81919007109aad61a089-source)** — 同样的质量方法论，打开即用。粘贴 URL，获得结构化对比。

## 功能

**Compare（对比）** — 给一个话题（可选来源 URL），输出两层：
- **Card**（终端）— 快速浏览：共识、分歧、盲区、结论
- **Report**（文件或 `--full`）— 深度分析：发现、冲突、推论、合规检查

**Verify（验证）** — 给一篇文章和来源 URL，逐条验证：哪些论断有支持、哪些被反驳、哪些查不到。

## 安装

```bash
git clone <repo-url> && cd Loom
pnpm install
pnpm build
```

不构建直接运行：

```bash
pnpm dev -- compare "React vs Vue 哪个更适合企业级项目" -s <url1> <url2>
```

## 用法

### 对比

```bash
# 自动找来源（需要 Claude CLI 或 Codex CLI）
loom compare "2025 电动汽车市场趋势"

# 手动指定来源
loom compare "React vs Vue" \
  -s https://example.com/article1 https://example.com/article2

# Card → 终端，完整报告 → 文件
loom compare "主题" -s <url1> <url2> -o report.md

# Card + 报告 → 终端
loom compare "主题" -s <url1> <url2> --full

# 快捷方式（compare 是默认命令）
loom "React vs Vue"
```

### 验证

```bash
# 验证文件
loom verify report.md -s https://example.com/article1 https://example.com/article2

# 从 stdin 读取
cat draft.txt | loom verify - -s <url1> <url2>

# 输出到文件
loom verify report.md -s <url1> <url2> -o check.md
```

### 配置

```bash
loom config set apiKey sk-your-key       # BYOK API Key
loom config set apiBase https://api.openai.com/v1
loom config set model gpt-4o
loom config list                          # 查看所有配置（apiKey 打码）
loom config reset                         # 清除所有配置
```

## AI 后端

自动检测，按优先级：

| 优先级 | 后端 | 条件 |
|--------|------|------|
| 1 | Claude CLI | `claude` 在 PATH 中 |
| 2 | Codex CLI | `codex` 在 PATH 中 |
| 3 | BYOK API | 已配置 API Key |

自动来源模式下，CLI 后端会获得网页搜索工具。检测到 CLI 就不需要 API Key。

配置文件位置：`%APPDATA%\loom\config.json`（Windows）或 `~/.loom/config.json`（macOS/Linux）。

凭据解析优先级：`--api-key` 参数 > `LOOM_API_KEY` 环境变量 > 配置文件。

## 质量规则

硬编码，不可配置。研究诚信没有 settings。

1. **每个论断引用来源** — S1、S2 等。没来源？标 `[待验证]`。
2. **保留冲突** — 来源有分歧就写出来。不合成"综合观点"。
3. **证据分级** — `[Strong]`、`[Moderate]`、`[Weak]`、`[Contested]`。
4. **标注推论** — "来源说的" vs "我推断的"。
5. **承认不确定** — 证据薄就说薄。
6. **交付前扫描** — 检查有没有把分歧藏起来。

合规检查由程序完成，不是 AI 自评。

## 架构

```
CLI (src/cli.ts)
  ├── fetchSources()       ← source-fetcher.ts (Readability + JSDOM)
  ├── buildComparePrompt() / buildVerifyPrompt()  ← prompt-builder.ts
  ├── routeToAI()          ← ai-router.ts (claude CLI → codex CLI → BYOK API)
  └── processOutput()      ← output-processor.ts (card/report 分割 + 合规检查)
```

```
src/
├── cli.ts                     Commander 入口
├── lib/
│   ├── ai-router.ts           3 层后端检测
│   ├── config.ts              本地配置管理
│   ├── output-processor.ts    双层输出 + 合规检查
│   ├── prompt-builder.ts      提示词组装（含质量规则）
│   ├── quality-rules.ts       核心规则、红线、证据标签
│   └── source-fetcher.ts      URL 抓取 + Readability 提取
└── prompts/
    ├── compare-prompt.md      对比模式系统提示词
    └── verify-prompt.md       验证模式系统提示词
```

## 许可证

ISC

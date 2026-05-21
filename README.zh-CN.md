# Loom

一个 CLI 工具。抓取网页源材料，发给 AI，在输出上强制执行研究质量规则。最终产出是一份结构化的研究报告，带证据标签、来源引用和合规检查。

## 工作流程

```
URLs ──► 源材料抓取 ──► 提示词构建 ──► AI 路由 ──► 输出处理
          (Readability)  (质量规则 +        (claude /     (证据标签、
                         源材料 + 主题)      codex /       合规报告)
                                            BYOK API)
```

## 安装

```bash
git clone <repo-url> && cd Loom
pnpm install
pnpm build
```

不构建直接运行：

```bash
pnpm dev <主题> -s <url1> <url2> ...
```

## 用法

```bash
# 基本用法 — 输出到终端
loom-research "2025 年电动汽车市场趋势" \
  -s https://example.com/article1 \
     https://example.com/article2

# 保存到文件
loom-research "2025 年电动汽车市场趋势" \
  -s https://example.com/article1 \
  -o report.md

# 指定模型（仅 BYOK 模式）
loom-research "主题" -s <url> -m gpt-4o-mini
```

## AI 后端

Loom 按以下顺序自动检测可用的 AI 后端：

| 优先级 | 后端 | 条件 |
|--------|------|------|
| 1 | Claude CLI | 已安装 `claude` 且在 PATH 中 |
| 2 | Codex CLI | 已安装 `codex` 且在 PATH 中 |
| 3 | BYOK API | 已配置 API Key（见下方） |

检测到 CLI 就直接用，不需要 API Key。

### 配置 BYOK API

没有 CLI 时，Loom 回退到任何 OpenAI 兼容的 API。

```bash
# 设置 API Key（存在本地，不写环境变量）
loom-research config set apiKey sk-your-key-here

# 可选：改端点和模型
loom-research config set apiBase https://api.openai.com/v1
loom-research config set model gpt-4o
```

配置文件位置：
- **Windows**: `%APPDATA%\loom\config.json`
- **macOS/Linux**: `~/.loom/config.json`

API Key 在 `config list` 和 `config get` 输出中会打码。

```bash
loom-research config list          # 查看所有配置
loom-research config get apiKey    # 查看指定项（打码）
loom-research config delete apiKey # 删除某项
loom-research config reset         # 清除所有配置
```

也可以通过命令行参数或环境变量传入。优先级：

1. `--api-key` 命令行参数
2. `LOOM_API_KEY` 环境变量
3. 本地配置文件

## 质量规则

每份研究报告都经过以下检查：

1. **来源引用** — 每个事实性论断必须标注来源（S1, S2, ...）。无来源的标 `[待验证]`。
2. **保留冲突** — 来源之间有分歧就写出来，不合成"综合观点"。
3. **证据分级** — 每个结论带标签：`[Strong]`、`[Moderate]`、`[Weak]`、`[Contested]`。
4. **标注推论** — 报告区分"来源说的"和"我推断的"。
5. **承认不确定** — 证据薄弱就说薄弱。
6. **交付前扫描** — 最后检查一遍有没有把分歧藏起来。

合规检查通过正则匹配后处理完成，不是让 AI 自评。

## 输出结构

每份报告包含：

- **摘要** — 一段话
- **发现** — 每项带来源引用和证据标签
- **冲突与分歧** — 谁说了什么
- **推论与来源主张** — 明确区分
- **置信度与注意事项** — 如实评估
- **Loom 合规报告** — 自动检查结果

## 项目结构

```
src/
├── cli.ts                  # Commander CLI 入口
├── lib/
│   ├── ai-router.ts        # 后端检测与路由
│   ├── config.ts           # 本地配置管理
│   ├── output-processor.ts # 合规检查与渲染
│   ├── prompt-builder.ts   # 组装提示词（含质量规则）
│   ├── quality-rules.ts    # 核心规则、红线、证据标签
│   └── source-fetcher.ts   # URL 抓取 + Readability 提取
└── prompts/
    └── system-prompt.md    # 完整的质量指令（给 AI 用）
```

## 许可证

ISC

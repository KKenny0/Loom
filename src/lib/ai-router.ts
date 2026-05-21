import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';

export interface AIResponse {
  content: string;
  model: string;
  backend: 'claude-cli' | 'codex-cli' | 'byok-api';
}

/**
 * Resolve the actual executable path for a CLI command on Windows.
 * `where` returns both `claude` (shell script) and `claude.cmd` (Windows batch).
 * Node's execFile needs the .cmd variant on Windows.
 */
function resolveCmd(cmd: string): string | null {
  try {
    const result = execFileSync('where', [cmd], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5_000,
    });
    // On Windows, prefer .cmd variant
    const lines = result.trim().split(/\r?\n/);
    const cmdVariant = lines.find((l) => l.endsWith('.cmd'));
    return cmdVariant || lines[0] || null;
  } catch {
    return null;
  }
}

// --- CLI spawn helper ---

function spawnCLI(
  exePath: string,
  args: string[],
  workDir: string,
  timeout: number,
): string {
  // On Windows, .cmd files must be spawned via shell
  const useShell = process.platform === 'win32';
  const stdout = execFileSync(exePath, args, {
    cwd: workDir,
    encoding: 'utf-8',
    timeout,
    maxBuffer: 10 * 1024 * 1024,
    shell: useShell,
    windowsHide: true,
  });
  return stdout.trim();
}

// --- Claude CLI ---
// Claude Code auto-loads CLAUDE.md from the working directory.
// We write the full prompt + sources into CLAUDE.md to avoid
// Windows command-line length limits on the -p argument.

function spawnClaudeCLI(prompt: string, sources: Array<{ id: string; content: string }>): AIResponse {
  const workDir = join(tmpdir(), `loom-research-${randomUUID()}`);
  mkdirSync(workDir, { recursive: true });

  try {
    // Write full prompt content into CLAUDE.md (auto-loaded by Claude Code)
    const sourceBlocks = sources
      .map((s) => `## ${s.id}\n${s.content || '[No content extracted]'}`)
      .join('\n\n---\n\n');

    const claudeMd = `${prompt}\n\n# Sources\n\n${sourceBlocks}`;
    writeFileSync(join(workDir, 'CLAUDE.md'), claudeMd, 'utf-8');

    // Keep -p argument short — the model will read CLAUDE.md automatically
    const exePath = resolveCmd('claude') || 'claude';
    const content = spawnCLI(exePath, [
      '-p', 'Read CLAUDE.md for the full research task with quality rules and sources. Produce the research report as specified.',
      '--allowedTools', 'none',
    ], workDir, 300_000);

    return { content, model: 'claude', backend: 'claude-cli' };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// --- Codex CLI ---

function spawnCodexCLI(prompt: string, sources: Array<{ id: string; content: string }>): AIResponse {
  const workDir = join(tmpdir(), `loom-research-${randomUUID()}`);
  mkdirSync(workDir, { recursive: true });
  mkdirSync(join(workDir, 'sources'), { recursive: true });

  try {
    for (const s of sources) {
      writeFileSync(join(workDir, 'sources', `${s.id}.md`), s.content || '[No content extracted]', 'utf-8');
    }

    const outputFile = join(workDir, 'output.md');
    const exePath = resolveCmd('codex') || 'codex';

    spawnCLI(exePath, [
      'exec',
      '--sandbox', 'read-only',
      '--ignore-rules',
      '--output-last-message', outputFile,
      prompt,
    ], workDir, 300_000);

    const content = readFileSync(outputFile, 'utf-8').trim();

    return { content, model: 'codex', backend: 'codex-cli' };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

// --- BYOK API ---

async function callByokAPI(prompt: string): Promise<AIResponse> {
  const apiKey = process.env.LOOM_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No AI backend available.\n' +
      'Install Claude CLI (claude) or Codex CLI (codex), or set LOOM_API_KEY for API access.\n' +
      'Optional: LOOM_API_BASE (default: https://api.openai.com/v1), LOOM_MODEL (default: gpt-4o).',
    );
  }

  const baseURL = process.env.LOOM_API_BASE || 'https://api.openai.com/v1';
  const model = process.env.LOOM_MODEL || 'gpt-4o';

  const client = new OpenAI({ apiKey, baseURL });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16_384,
  });

  return {
    content: response.choices[0]?.message?.content || '',
    model,
    backend: 'byok-api',
  };
}

// --- Main router ---

export async function routeToAI(
  prompt: string,
  sources: Array<{ id: string; content: string }>,
): Promise<AIResponse> {
  // Detection order: claude CLI → codex CLI → BYOK API
  if (resolveCmd('claude')) {
    console.log('Using Claude CLI backend...');
    return spawnClaudeCLI(prompt, sources);
  }

  if (resolveCmd('codex')) {
    console.log('Using Codex CLI backend...');
    return spawnCodexCLI(prompt, sources);
  }

  console.log('No CLI detected, using BYOK API...');
  return callByokAPI(prompt);
}

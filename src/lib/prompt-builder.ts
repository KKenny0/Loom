import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SourceContent } from './source-fetcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt(): string {
  const promptPath = resolve(__dirname, '../../prompts/system-prompt.md');
  return readFileSync(promptPath, 'utf-8');
}

function formatSources(sources: SourceContent[]): string {
  return sources
    .map((s) => {
      const contentBlock = s.content
        ? s.content
        : '[Content could not be extracted from this URL]';
      return `## ${s.id}: ${s.title}\nURL: ${s.url}\n\n${contentBlock}`;
    })
    .join('\n\n---\n\n');
}

export function buildPrompt(topic: string, sources: SourceContent[]): string {
  const systemPrompt = loadSystemPrompt();
  const sourceBlocks = formatSources(sources);

  return `${systemPrompt}

---

# Sources

${sourceBlocks}

---

# Research Task

Topic: **${topic}**

Analyze the above sources following the quality rules and produce a research report. Cite sources using S1, S2, etc. Mark unsourced claims with [待验证]. Preserve any disagreements between sources.
`;
}

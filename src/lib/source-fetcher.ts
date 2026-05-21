import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

export interface SourceContent {
  id: string;         // 'S1', 'S2', ...
  url: string;
  title: string;
  content: string;    // Extracted readable text
  fetchedAt: Date;
}

const TIMEOUT_MS = 15_000;

async function fetchUrl(url: string): Promise<{ title: string; content: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LoomResearch/0.1)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return { title: url, content: '' };
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent?.trim()) {
      return { title: url, content: '' };
    }

    return {
      title: article.title || url,
      content: article.textContent.trim(),
    };
  } catch {
    return { title: url, content: '' };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSources(urls: string[]): Promise<SourceContent[]> {
  const results = await Promise.all(
    urls.map(async (url, index) => {
      const id = `S${index + 1}`;
      const { title, content } = await fetchUrl(url);

      if (!content) {
        console.warn(`Warning: Failed to extract content from ${url}`);
      }

      return {
        id,
        url,
        title,
        content,
        fetchedAt: new Date(),
      } satisfies SourceContent;
    }),
  );

  return results;
}

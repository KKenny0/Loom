import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface LoomConfig {
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

const CONFIG_FILE_NAME = 'config.json';

/**
 * Cross-platform config directory:
 * - Windows: %APPDATA%/loom/
 * - macOS/Linux: ~/.loom/
 */
export function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'loom');
  }
  return join(homedir(), '.loom');
}

function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME);
}

function readConfigFile(): LoomConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeConfigFile(config: LoomConfig): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfig(key: string): string | undefined {
  return readConfigFile()[key as keyof LoomConfig];
}

export function setConfig(key: string, value: string): void {
  const config = readConfigFile();
  (config as Record<string, string>)[key] = value;
  writeConfigFile(config);
}

export function deleteConfig(key: string): boolean {
  const config = readConfigFile();
  if (!(key in config)) return false;
  delete (config as Record<string, string>)[key];
  writeConfigFile(config);
  return true;
}

export function listConfig(): LoomConfig {
  return readConfigFile();
}

export function resetConfig(): void {
  const dir = getConfigDir();
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Resolve API credentials with priority:
 * 1. Explicit parameter (from CLI flag)
 * 2. Environment variable
 * 3. Local config file
 */
export function resolveApiKey(explicit?: string): string | undefined {
  return explicit || process.env.LOOM_API_KEY || getConfig('apiKey');
}

export function resolveApiBase(explicit?: string): string | undefined {
  return explicit || process.env.LOOM_API_BASE || getConfig('apiBase');
}

export function resolveModel(explicit?: string): string | undefined {
  return explicit || process.env.LOOM_MODEL || getConfig('model');
}

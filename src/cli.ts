#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'node:fs';
import { fetchSources } from './lib/source-fetcher.js';
import { buildPrompt } from './lib/prompt-builder.js';
import { routeToAI } from './lib/ai-router.js';
import { processOutput } from './lib/output-processor.js';
import { getConfig, setConfig, deleteConfig, listConfig, resetConfig } from './lib/config.js';

const program = new Command();

program
  .name('loom-research')
  .description('Source-grounded research quality tool')
  .version('0.1.0');

// --- config subcommand ---

const configCmd = new Command('config')
  .description('Manage local configuration (apiKey, apiBase, model)');

configCmd
  .command('set <key> <value>')
  .description('Set a config value')
  .action((key: string, value: string) => {
    setConfig(key, value);
    console.log(chalk.green(`✓ ${key} saved to ${key === 'apiKey' ? '***' : value}`));
  });

configCmd
  .command('get <key>')
  .description('Get a config value')
  .action((key: string) => {
    const value = getConfig(key);
    if (value === undefined) {
      console.log(chalk.yellow(`${key} is not set`));
    } else {
      console.log(key === 'apiKey' ? `${key}: ***` : `${key}: ${value}`);
    }
  });

configCmd
  .command('delete <key>')
  .description('Delete a config value')
  .action((key: string) => {
    const removed = deleteConfig(key);
    if (removed) {
      console.log(chalk.green(`✓ ${key} removed`));
    } else {
      console.log(chalk.yellow(`${key} was not set`));
    }
  });

configCmd
  .command('list')
  .description('List all config values (apiKey masked)')
  .action(() => {
    const config = listConfig();
    const entries = Object.entries(config);
    if (entries.length === 0) {
      console.log(chalk.dim('No config values set'));
      return;
    }
    for (const [key, value] of entries) {
      const display = key === 'apiKey' ? '***' : value;
      console.log(`  ${key}: ${display}`);
    }
  });

configCmd
  .command('reset')
  .description('Delete all config and the config directory')
  .action(() => {
    resetConfig();
    console.log(chalk.green('✓ All config cleared'));
  });

program.addCommand(configCmd);

// --- research (default command) ---

program
  .command('research', { isDefault: true, hidden: true })
  .argument('<topic>', 'Research topic')
  .requiredOption('-s, --sources <urls...>', 'Source URLs to analyze')
  .option('-o, --output <file>', 'Output file path (defaults to stdout)')
  .option('-m, --model <model>', 'Model override (for BYOK API mode)')
  .option('--api-key <key>', 'API key for BYOK mode (prefer config or env var)')
  .action(async (topic: string, options: {
    sources: string[];
    output?: string;
    model?: string;
    apiKey?: string;
  }) => {
    // Step 1: Fetch sources
    const spinner = ora('Fetching sources...').start();
    const sources = await fetchSources(options.sources);
    const fetched = sources.filter((s) => s.content.length > 0);

    if (fetched.length === 0) {
      spinner.fail('Could not extract content from any source URL');
      process.exit(1);
    }

    spinner.succeed(`Fetched ${fetched.length}/${sources.length} sources`);

    for (const s of sources) {
      const status = s.content ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${s.id}: ${s.title}`);
    }

    // Step 2: Build prompt
    spinner.start('Building research prompt...');
    const prompt = buildPrompt(topic, sources);
    spinner.succeed('Prompt built');

    // Step 3: Route to AI
    spinner.start('Sending to AI backend...');
    try {
      if (options.model) {
        process.env.LOOM_MODEL = options.model;
      }
      if (options.apiKey) {
        process.env.LOOM_API_KEY = options.apiKey;
      }

      const aiResponse = await routeToAI(
        prompt,
        sources.map((s) => ({ id: s.id, content: s.content })),
      );

      spinner.succeed(`AI response received (${aiResponse.backend}, model: ${aiResponse.model})`);

      // Step 4: Process output
      spinner.start('Processing output...');
      const result = processOutput(aiResponse.content);
      spinner.succeed('Output processed');

      // Step 5: Write output
      if (options.output) {
        writeFileSync(options.output, result.rendered, 'utf-8');
        console.log(chalk.green(`\nOutput written to ${options.output}`));
      } else {
        console.log('\n' + result.rendered);
      }

      // Print compliance summary to stderr
      console.error(chalk.dim(`\n--- Compliance ---`));
      console.error(chalk.dim(`Evidence tags: ${result.compliance.hasEvidenceTags ? '✓' : '✗'}`));
      console.error(chalk.dim(`Conflict section: ${result.compliance.hasConflictSection ? '✓' : '✗'}`));
      console.error(chalk.dim(`Unverified claims: ${result.compliance.unverifiedCount}`));
      console.error(chalk.dim(`Source references: ${result.compliance.sourceRefCount}`));
    } catch (err) {
      spinner.fail('AI processing failed');
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    }
  });

program.parse();

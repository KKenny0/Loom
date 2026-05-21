#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync } from 'node:fs';
import { fetchSources } from './lib/source-fetcher.js';
import { buildPrompt } from './lib/prompt-builder.js';
import { routeToAI } from './lib/ai-router.js';
import { processOutput } from './lib/output-processor.js';

const program = new Command();

program
  .name('loom-research')
  .description('Source-grounded research quality tool')
  .version('0.1.0')
  .argument('<topic>', 'Research topic')
  .requiredOption('-s, --sources <urls...>', 'Source URLs to analyze')
  .option('-o, --output <file>', 'Output file path (defaults to stdout)')
  .option('-m, --model <model>', 'Model override (for BYOK API mode)')
  .action(async (topic: string, options: {
    sources: string[];
    output?: string;
    model?: string;
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

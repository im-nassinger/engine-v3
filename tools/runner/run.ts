// The runner: starts one fresh Claude session per step until the plan is finished.
// See docs/runner.md. Run from the project root: node tools/runner/run.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { runClaudeSession } from './ClaudeSession.ts';
import { DiscordNotifier } from './DiscordNotifier.ts';
import { RateLimitTracker } from './RateLimitTracker.ts';
import { parseStatusReport, percentComplete } from './StatusReport.ts';
import type { StatusReport } from './StatusReport.ts';

const MINUTE_MS = 60 * 1000;
const LIMIT_RETRY_MS = 30 * MINUTE_MS;
const FAILURE_RETRY_MS = 5 * MINUTE_MS;
const MAX_FAILURES_IN_A_ROW = 3;

const projectFolder = path.resolve(import.meta.dirname, '../..');
const stateFolder = path.join(os.homedir(), '.local/state/engine-v3-runner');
const logFolder = path.join(stateFolder, 'sessions');
const pauseFile = path.join(stateFolder, 'paused');
const promptFile = path.join(import.meta.dirname, 'prompt.md');

const webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? '';
if (webhookUrl === '') {
    console.error('DISCORD_WEBHOOK_URL is not set. See docs/runner.md.');
    process.exit(1);
}

const discord = new DiscordNotifier(webhookUrl);
const rateLimits = new RateLimitTracker();
const sentNeeds = new Set<string>();

function git(...args: string[]) {
    return execFileSync('git', args, { cwd: projectFolder, encoding: 'utf8' }).trim();
}

function formatTime(timeMs: number) {
    const time = new Date(timeMs);
    return time.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

async function pause(reason: string) {
    fs.writeFileSync(pauseFile, `${reason}\n`);
    await discord.send(`⏸️ **Paused:** ${reason}\nTo resume: \`rm ${pauseFile}\``);
}

async function waitWhilePaused() {
    while (fs.existsSync(pauseFile)) {
        await sleep(MINUTE_MS);
    }
}

async function sendLimitWarnings() {
    for (const warning of rateLimits.takeNewWarnings()) {
        const resetText = formatTime(warning.resetsAtMs);
        await discord.send(
            `⚠️ ${warning.percentUsed}% of the ${warning.windowName} usage limit used. Resets ${resetText}.`,
        );
    }
}

async function waitForLimitReset() {
    const resumeTimeMs = rateLimits.resumeTimeMs() ?? Date.now() + LIMIT_RETRY_MS;
    const waitMs = Math.max(MINUTE_MS, resumeTimeMs - Date.now() + MINUTE_MS);
    const resumeText = formatTime(Date.now() + waitMs);

    await discord.send(`🛑 **Usage limit reached.** Resuming at ${resumeText}.`);
    await sleep(waitMs);

    rateLimits.clearAfterReset();
    await discord.send('▶️ Limit reset, resuming.');
}

async function reportStep(report: StatusReport, newCommits: string) {
    const percent = percentComplete(report);
    const stepText = report.stepCount > 0 ? `, step ${report.step} of ${report.stepCount}` : '';
    const commitLines = newCommits === '' ? '(no commit)' : newCommits;

    await discord.send(
        `✅ **engine-v3: ${percent}%** (stage ${report.stage}${stepText})\n${report.summary}\n\`\`\`\n${commitLines}\n\`\`\``,
    );
}

async function reportNeeds(report: StatusReport) {
    if (sentNeeds.has(report.needs)) return;
    sentNeeds.add(report.needs);

    await discord.send(
        `🔑 **Needs your password.** Run this, then the runner picks it up on its own:\n\`\`\`\n${report.needs}\n\`\`\``,
    );
}

async function runOneStep() {
    const prompt = fs.readFileSync(promptFile, 'utf8');
    const startCommit = git('rev-parse', 'HEAD');
    const startedAt = new Date().toISOString().replaceAll(':', '-');
    const logFile = path.join(logFolder, `${startedAt}.jsonl`);

    console.log(`Session started, log in ${logFile}`);
    const result = await runClaudeSession({
        projectFolder,
        prompt,
        logFile,
        rateLimits,
        onRateLimitEvent: () => void sendLimitWarnings(),
    });
    console.log(`Session ended with code ${result.exitCode}`);

    const newCommits = git('log', '--format=%h %s', `${startCommit}..HEAD`);
    const report = parseStatusReport(result.finalText);
    const mentionsLimit = /usage limit|hit your limit|rate limit/i.test(result.finalText);

    if (report === undefined && (rateLimits.isLimitReached() || mentionsLimit)) {
        return { kind: 'limit' } as const;
    }
    if (report === undefined) {
        return { kind: 'failed', result, logFile } as const;
    }

    return { kind: 'reported', report, newCommits } as const;
}

async function main() {
    fs.mkdirSync(logFolder, { recursive: true });
    await discord.send('🚀 Runner started.');

    let failuresInARow = 0;

    while (true) {
        await waitWhilePaused();

        const outcome = await runOneStep();

        if (outcome.kind === 'limit') {
            await waitForLimitReset();
            continue;
        }

        if (outcome.kind === 'failed') {
            failuresInARow += 1;
            const reason = outcome.result.wentSilent
                ? 'no output for 30 minutes'
                : `exit code ${outcome.result.exitCode}`;
            const lastWords = outcome.result.finalText.slice(-600);
            await discord.send(
                `❌ Session ended without a status (${reason}). Log: \`${outcome.logFile}\`\n\`\`\`\n${lastWords}\n\`\`\``,
            );

            if (failuresInARow >= MAX_FAILURES_IN_A_ROW) {
                await pause(`${MAX_FAILURES_IN_A_ROW} sessions in a row ended without a status.`);
                failuresInARow = 0;
                continue;
            }

            await sleep(FAILURE_RETRY_MS);
            continue;
        }

        failuresInARow = 0;
        const report = outcome.report;
        await reportStep(report, outcome.newCommits);

        if (report.status === 'sudo') {
            await reportNeeds(report);
        }

        if (report.status === 'blocked') {
            await pause(`Claude is blocked: ${report.needs}`);
        }

        if (report.status === 'finished') {
            await discord.send('🎉 **v1 is finished.** Every stage of the plan is done. The runner stops.');
            return;
        }
    }
}

await main();

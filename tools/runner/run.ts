// The runner: starts one fresh Claude session per step until the plan is finished.
// See docs/runner/. Run from the project root: node tools/runner/run.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleepFor } from 'node:timers/promises';
import { runClaudeSession } from './ClaudeSession.ts';
import { DiscordNotifier } from './DiscordNotifier.ts';
import { RateLimitTracker } from './RateLimitTracker.ts';
import { StatusFile } from './StatusFile.ts';
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
const planFile = path.join(projectFolder, 'docs/plan.md');
const statusFilePath = path.join(projectFolder, 'docs/runner/status.md');
const RESTART_EXIT_CODE = 75;

const webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? '';
if (webhookUrl === '') {
    console.error('DISCORD_WEBHOOK_URL is not set. See docs/runner/how-it-works.md.');
    process.exit(1);
}

const discord = new DiscordNotifier(webhookUrl);
const rateLimits = new RateLimitTracker();
const sentNeeds = new Set<string>();

fs.mkdirSync(stateFolder, { recursive: true });
const statusFile = new StatusFile(statusFilePath, path.join(stateFolder, 'status.json'));

// Every message goes both to Discord and to the status file.
async function announce(message: string) {
    statusFile.addEvent(formatTime(Date.now()), message);
    await discord.send(message);
}

function git(...args: string[]) {
    return execFileSync('git', args, { cwd: projectFolder, encoding: 'utf8' }).trim();
}

// Waits by the wall clock, a minute at a time. A plain timer stops counting while the
// computer sleeps, so after a night asleep it would still be waiting for hours.
async function sleepUntil(wakeTimeMs: number) {
    while (Date.now() < wakeTimeMs) {
        const remainingMs = wakeTimeMs - Date.now();
        await sleepFor(Math.min(MINUTE_MS, remainingMs));
    }
}

async function sleep(durationMs: number) {
    await sleepUntil(Date.now() + durationMs);
}

function formatTime(timeMs: number) {
    const time = new Date(timeMs);
    return time.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
}

async function pause(reason: string) {
    fs.writeFileSync(pauseFile, `${reason}\n`);
    statusFile.setState(`Paused: ${reason} To resume: \`rm ${pauseFile}\`.`);
    await announce(`⏸️ **Paused:** ${reason}\nTo resume: \`rm ${pauseFile}\``);
}

async function waitWhilePaused() {
    while (fs.existsSync(pauseFile)) {
        await sleep(MINUTE_MS);
    }
}

async function sendLimitWarnings() {
    for (const warning of rateLimits.takeNewWarnings()) {
        const resetText = formatTime(warning.resetsAtMs);
        await announce(
            `⚠️ ${warning.percentUsed}% of the ${warning.windowName} usage limit used. Resets ${resetText}.`,
        );
    }
}

async function waitForLimitReset() {
    const resumeTimeMs = rateLimits.resumeTimeMs() ?? Date.now() + LIMIT_RETRY_MS;
    const waitMs = Math.max(MINUTE_MS, resumeTimeMs - Date.now() + MINUTE_MS);
    const resumeText = formatTime(Date.now() + waitMs);

    await announce(`🛑 **Usage limit reached.** Resuming at ${resumeText}.`);
    statusFile.setState(`Waiting for the usage limit to reset, until ${resumeText}.`);
    await sleep(waitMs);

    rateLimits.clearAfterReset();
    await announce('▶️ Limit reset, resuming.');
}

// Reads the stage names from the plan's table, such as "The model" for stage 1.
function readStageName(stage: number) {
    const planText = fs.readFileSync(planFile, 'utf8');
    const rowPattern = new RegExp(`^\\| ${stage} \\| \\*\\*(.+?)\\*\\* \\|`, 'm');
    const match = rowPattern.exec(planText);

    return match?.[1] ?? '';
}

async function reportStep(report: StatusReport, newCommits: string) {
    const percent = percentComplete(report);
    const stageName = readStageName(report.stage);

    let stageText = `Stage ${report.stage}: ${stageName}`;
    if (report.stepCount > 0) {
        stageText += `, step ${report.step} of ${report.stepCount}`;
    }

    let summary = report.summary;
    if (newCommits === '') {
        summary += ' (nothing committed)';
    }

    statusFile.setProgress(`**${percent}%** · ${stageText}.`);
    await announce(`✅ **v1: ${percent}%** · ${stageText}\n${summary}`);
}

// The runner's own code changes when a session or the owner edits it. Restarting between
// sessions picks up the change; systemd starts it again because the exit code isn't 0.
function readRunnerCode() {
    const fileNames = fs.readdirSync(import.meta.dirname).filter((fileName) => fileName.endsWith('.ts'));
    const contents = fileNames.map((fileName) => fs.readFileSync(path.join(import.meta.dirname, fileName), 'utf8'));

    return contents.join('\n');
}

async function reportNeeds(report: StatusReport) {
    if (sentNeeds.has(report.needs)) return;
    sentNeeds.add(report.needs);

    await announce(
        `🔑 **Needs your password.** Run this, then the runner picks it up on its own:\n\`\`\`\n${report.needs}\n\`\`\``,
    );
}

async function runOneStep() {
    const prompt = fs.readFileSync(promptFile, 'utf8');
    const startCommit = git('rev-parse', 'HEAD');
    const startedAt = new Date().toISOString().replaceAll(':', '-');
    const logFile = path.join(logFolder, `${startedAt}.jsonl`);

    console.log(`Session started, log in ${logFile}`);
    statusFile.setState(`Running a session, started ${formatTime(Date.now())}. Its full output: \`${logFile}\`.`);
    const result = await runClaudeSession({
        projectFolder,
        prompt,
        logFile,
        rateLimits,
        onRateLimitEvent: () => {
            statusFile.setUsage(rateLimits.describeUsage(formatTime));
            void sendLimitWarnings();
        },
    });
    console.log(`Session ended with code ${result.exitCode}`);

    const newCommits = git('log', '--format=%h %s', `${startCommit}..HEAD`);
    const report = parseStatusReport(result.finalText);
    const mentionsLimit = /usage limit|hit your .*limit|rate limit/i.test(result.finalText);
    const isLimitError = result.apiError === 'usage_limit_reached';

    if (report === undefined && (rateLimits.isLimitReached() || isLimitError || mentionsLimit)) {
        return { kind: 'limit' } as const;
    }
    if (report === undefined) {
        return { kind: 'failed', result, logFile } as const;
    }

    return { kind: 'reported', report, newCommits } as const;
}

async function main() {
    fs.mkdirSync(logFolder, { recursive: true });

    const startingCode = readRunnerCode();
    let failuresInARow = 0;

    while (true) {
        if (readRunnerCode() !== startingCode) {
            console.log('The runner code changed, restarting.');
            process.exit(RESTART_EXIT_CODE);
        }

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
            await announce(
                `❌ Session ended without a status (${reason}). Log: \`${outcome.logFile}\`\n\`\`\`\n${lastWords}\n\`\`\``,
            );

            if (failuresInARow >= MAX_FAILURES_IN_A_ROW) {
                await pause(`${MAX_FAILURES_IN_A_ROW} sessions in a row ended without a status.`);
                failuresInARow = 0;
                continue;
            }

            statusFile.setState('Waiting 5 minutes after a session that ended without a status, then trying again.');
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
            statusFile.setState('Finished: v1 is done, and the runner has stopped.');
            await announce('🎉 **v1 is finished.** Every stage of the plan is done. The runner stops.');
            return;
        }
    }
}

await main();

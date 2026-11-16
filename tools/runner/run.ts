// The runner: starts one fresh Claude session per step until the plan is finished.
// See docs/runner/. Run from the project root: node tools/runner/run.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleepFor } from 'node:timers/promises';
import { CiChecker } from './CiChecker.ts';
import type { CiFailure } from './CiChecker.ts';
import { runClaudeSession } from './ClaudeSession.ts';
import { DiscordNotifier } from './DiscordNotifier.ts';
import { PidFile } from './PidFile.ts';
import { RateLimitTracker } from './RateLimitTracker.ts';
import { StatusFile } from './StatusFile.ts';
import { hasNeeds, parseRunnerLine, parseStatusReport, percentComplete } from './StatusReport.ts';
import type { RunnerLine, StatusReport } from './StatusReport.ts';

const MINUTE_MS = 60 * 1000;
const LIMIT_RETRY_MS = 30 * MINUTE_MS;
const FAILURE_RETRY_MS = 5 * MINUTE_MS;
const MAX_FAILURES_IN_A_ROW = 3;
const MAX_CI_FIX_ATTEMPTS = 3;

const projectFolder = path.resolve(import.meta.dirname, '../..');
const stateFolder = path.join(os.homedir(), '.local/state/engine-v3-runner');
const logFolder = path.join(stateFolder, 'sessions');
const pauseFile = path.join(stateFolder, 'paused');
const promptFile = path.join(import.meta.dirname, 'prompt.md');
const ciFixPromptFile = path.join(import.meta.dirname, 'ci-fix-prompt.md');
const planFile = path.join(projectFolder, 'docs/plan.md');
const progressFile = path.join(projectFolder, 'docs/progress.md');
const statusFilePath = path.join(projectFolder, 'docs/runner/status.md');
const RESTART_EXIT_CODE = 75;

const webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? '';
if (webhookUrl === '') {
    console.error('DISCORD_WEBHOOK_URL is not set. See docs/runner/how-it-works.md.');
    process.exit(1);
}

fs.mkdirSync(stateFolder, { recursive: true });

// Only one runner at a time, and only one of its sessions at a time: two sessions
// would edit the same files and commit over each other.
const runnerPidFile = new PidFile(path.join(stateFolder, 'runner.pid'), 'run.ts');
const sessionPidFile = new PidFile(path.join(stateFolder, 'session.pid'), 'claude');
claimRunnerLock();

const discord = new DiscordNotifier(webhookUrl);
const rateLimits = new RateLimitTracker();
const sentNeeds = new Set<string>();
const ciChecker = new CiChecker(projectFolder, sleep);
let ciWasFailing = false;

const statusFile = new StatusFile(statusFilePath, path.join(stateFolder, 'status.json'));

// Every message goes both to Discord and to the status file.
async function announce(message: string) {
    statusFile.addEvent(formatTime(Date.now()), message);
    await discord.send(message);
}

// Exits with a failure if another runner is alive, so systemd tries again a minute later.
function claimRunnerLock() {
    const otherRunnerId = runnerPidFile.readLiveProcessId();
    if (otherRunnerId !== undefined) {
        console.error(`Another runner is already running (process ${otherRunnerId}). Not starting a second one.`);
        process.exit(1);
    }

    runnerPidFile.remove();
    if (!runnerPidFile.writeIfAbsent(process.pid)) {
        console.error('Another runner started at the same moment. Not starting a second one.');
        process.exit(1);
    }

    process.on('exit', () => {
        if (runnerPidFile.readLiveProcessId() === process.pid) {
            runnerPidFile.remove();
        }
    });
}

// A session can outlive its runner if the runner is killed on its own. Starting
// the next one before it ends would put two sessions on the same step.
async function waitForEarlierSession() {
    let earlierSessionId = sessionPidFile.readLiveProcessId();
    if (earlierSessionId === undefined) return;

    statusFile.setState(
        `Waiting for an earlier session (process ${earlierSessionId}) to end before starting a new one.`,
    );
    console.log(`Waiting for an earlier session, process ${earlierSessionId}, to end.`);

    while (earlierSessionId !== undefined) {
        await sleepFor(MINUTE_MS);
        earlierSessionId = sessionPidFile.readLiveProcessId();
    }
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

// The stage and step come from the **Runner:** line sessions keep in docs/progress.md.
function readStageText(runnerLine: RunnerLine) {
    let stageText = `Stage ${runnerLine.stage}: ${readStageName(runnerLine.stage)}`;
    if (runnerLine.stepCount > 0) {
        stageText += `, step ${runnerLine.step} of ${runnerLine.stepCount}`;
    }

    return stageText;
}

async function reportStep(report: StatusReport, newCommits: string) {
    let summary = report.summary;
    if (newCommits === '') {
        summary += ' (nothing committed)';
    }

    const runnerLine = parseRunnerLine(fs.readFileSync(progressFile, 'utf8'));
    if (runnerLine === undefined) {
        await announce(`✅ **v1:** ${statusFile.readProgress()} (no **Runner:** line in docs/progress.md)\n${summary}`);
        return;
    }

    const percent = percentComplete(runnerLine, report.status);
    const stageText = readStageText(runnerLine);
    statusFile.setProgress(`**${percent}%** · ${stageText}.`);
    await announce(`✅ **v1: ${percent}%** · ${stageText}\n${summary}`);
}

// The runner pushes, not the session, so a session only has to commit.
async function pushNewCommits() {
    const unpushed = git('rev-list', '@{u}..HEAD');
    if (unpushed === '') return;

    try {
        git('push', 'origin', 'master');
    } catch (error) {
        const reason = error instanceof Error ? error.message.slice(-600) : String(error);
        await announce(
            `⚠️ **Push failed.** The commits stay local; the runner tries again after the next step.\n\`\`\`\n${reason}\n\`\`\``,
        );
    }
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
        `🔑 **Needs you.** The work goes on without it; once it's done, the runner picks it up on its own:\n\`\`\`\n${report.needs}\n\`\`\``,
    );
}

// Waits for CI on what the runner last pushed. Only a failure is returned: when CI can't
// be read, the work goes on rather than stalling on GitHub.
async function checkCi() {
    const pushedCommit = git('rev-parse', '@{u}');
    const shortCommit = pushedCommit.slice(0, 7);
    statusFile.setState(`Waiting for CI on \`${shortCommit}\` before starting the next session.`);

    const result = await ciChecker.waitForResult(pushedCommit);

    if (result.kind === 'unknown') {
        console.log(`CI result for ${shortCommit} unknown: ${result.reason}`);
        return undefined;
    }
    if (result.kind === 'passed') {
        if (ciWasFailing) {
            await announce(`🟢 **CI passes again** on \`${shortCommit}\`.`);
        }
        ciWasFailing = false;
        return undefined;
    }

    if (!ciWasFailing) {
        const steps = result.failedSteps.join(', ');
        await announce(
            `🔴 **CI failed** on \`${shortCommit}\` (${steps}). The next session fixes it first.\n${result.url}`,
        );
    }
    ciWasFailing = true;
    return result;
}

function buildPrompt(ciFailure: CiFailure | undefined) {
    const stepPrompt = fs.readFileSync(promptFile, 'utf8');
    if (ciFailure === undefined) return stepPrompt;

    const failedSteps = ciFailure.failedSteps.join(', ');
    const fixTemplate = fs.readFileSync(ciFixPromptFile, 'utf8');
    const fixPrompt = fixTemplate
        .replaceAll('{{COMMIT}}', ciFailure.commit)
        .replaceAll('{{URL}}', ciFailure.url)
        .replaceAll('{{FAILED_STEPS}}', failedSteps)
        .replaceAll('{{RUN_ID}}', String(ciFailure.runId))
        .replaceAll('{{LOG}}', ciFailure.logExcerpt);

    return `${fixPrompt}\n${stepPrompt}`;
}

async function runOneStep(ciFailure: CiFailure | undefined) {
    await waitForEarlierSession();

    const prompt = buildPrompt(ciFailure);
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
        onStarted: (processId) => {
            sessionPidFile.remove();
            sessionPidFile.writeIfAbsent(processId);
        },
    });
    sessionPidFile.remove();
    console.log(`Session ended with code ${result.exitCode}`);
    await pushNewCommits();

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
    let ciFixAttempts = 0;

    const progress = statusFile.readProgress();
    await announce(`🟢 **Runner started.** v1: ${progress}`);

    while (true) {
        if (readRunnerCode() !== startingCode) {
            console.log('The runner code changed, restarting.');
            process.exit(RESTART_EXIT_CODE);
        }

        await waitWhilePaused();

        const ciFailure = await checkCi();
        if (ciFailure === undefined) {
            ciFixAttempts = 0;
        } else if (ciFixAttempts >= MAX_CI_FIX_ATTEMPTS) {
            await pause(`CI still fails after ${MAX_CI_FIX_ATTEMPTS} sessions tried to fix it: ${ciFailure.url}`);
            ciFixAttempts = 0;
            continue;
        } else {
            ciFixAttempts += 1;
        }

        const outcome = await runOneStep(ciFailure);

        if (outcome.kind === 'limit') {
            // A session cut off by the limit didn't get its try at fixing CI.
            if (ciFailure !== undefined) {
                ciFixAttempts -= 1;
            }
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

        if (report.status === 'done' && hasNeeds(report)) {
            await reportNeeds(report);
        }

        if (report.status === 'blocked') {
            await pause(`Claude is blocked: ${report.needs}`);
        }

        if (report.status === 'finished') {
            const finalCiFailure = await checkCi();
            if (finalCiFailure !== undefined) continue;

            statusFile.setState('Finished: v1 is done, and the runner has stopped.');
            await announce('🎉 **v1 is finished.** Every stage of the plan is done. The runner stops.');
            return;
        }
    }
}

await main();

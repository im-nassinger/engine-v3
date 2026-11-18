import { execFileSync } from 'node:child_process';
import { PUBLIC_REPO } from './PublicCopy.ts';
import { isRecord } from './RateLimitTracker.ts';

const POLL_INTERVAL_MS = 60 * 1000;
// GitHub can take a moment to start a run after a push.
const RUN_APPEAR_TIMEOUT_MS = 5 * 60 * 1000;
const RUN_FINISH_TIMEOUT_MS = 45 * 60 * 1000;
const LOG_LINES_PER_STEP = 60;
const MINUTE_MS = 60 * 1000;

export type CiFailure = {
    commit: string;
    runId: number;
    url: string;
    failedSteps: string[];
    logExcerpt: string;
};

export type CiResult = { kind: 'passed' } | ({ kind: 'failed' } & CiFailure) | { kind: 'unknown'; reason: string };

type CiRun = {
    runId: number;
    status: string;
    conclusion: string;
    url: string;
};

type Sleep = (durationMs: number) => Promise<void>;
type ProgressListener = (progress: string) => void;

// Reads the CI workflow's result for a commit of the public copy through the `gh` command.
// See docs/runner/public-ci.md.
export class CiChecker {
    private readonly projectFolder: string;
    private readonly sleep: Sleep;

    constructor(projectFolder: string, sleep: Sleep) {
        this.projectFolder = projectFolder;
        this.sleep = sleep;
    }

    // Waits until CI on the public commit has finished. A failure names the source commit, the
    // private one a session can find. Never throws: a `gh` error is an unknown result.
    async waitForResult(publicCommit: string, sourceCommit: string, onProgress: ProgressListener): Promise<CiResult> {
        try {
            return await this.waitForRun(publicCommit, sourceCommit, onProgress);
        } catch (error) {
            const reason = error instanceof Error ? error.message.slice(-300) : String(error);
            return { kind: 'unknown', reason };
        }
    }

    private async waitForRun(
        publicCommit: string,
        sourceCommit: string,
        onProgress: ProgressListener,
    ): Promise<CiResult> {
        const startedAt = Date.now();

        while (true) {
            const waitedMs = Date.now() - startedAt;
            const run = this.findRun(publicCommit);

            if (run === undefined && waitedMs > RUN_APPEAR_TIMEOUT_MS) {
                return { kind: 'unknown', reason: 'no CI run started for this commit' };
            }
            if (run !== undefined && run.status === 'completed') {
                return this.readResult(sourceCommit, run);
            }
            if (waitedMs > RUN_FINISH_TIMEOUT_MS) {
                return { kind: 'unknown', reason: 'CI did not finish within 45 minutes' };
            }
            if (run !== undefined) {
                this.reportProgress(run.runId, onProgress);
            }

            await this.sleep(POLL_INTERVAL_MS);
        }
    }

    // Progress is only for the owner to read, so failing to get it must not end the wait.
    private reportProgress(runId: number, onProgress: ProgressListener) {
        try {
            const jobs = this.readJobs(runId);
            const progress = describeCiProgress(jobs, Date.now());
            onProgress(progress);
        } catch (error) {
            console.error('CI progress could not be read:', error);
        }
    }

    private readResult(commit: string, run: CiRun): CiResult {
        if (run.conclusion === 'success') return { kind: 'passed' };

        const isFailure = run.conclusion === 'failure' || run.conclusion === 'timed_out';
        if (!isFailure) {
            return { kind: 'unknown', reason: `CI ended as "${run.conclusion}"` };
        }

        const failedSteps = this.readFailedSteps(run.runId);
        const logExcerpt = this.readFailedLog(run.runId);

        return { kind: 'failed', commit, runId: run.runId, url: run.url, failedSteps, logExcerpt };
    }

    private findRun(commit: string) {
        const fields = 'databaseId,status,conclusion,url';
        const output = this.gh(
            'run',
            'list',
            '--commit',
            commit,
            '--workflow',
            'ci.yml',
            '--event',
            'push',
            '--json',
            fields,
            '--limit',
            '1',
            '--repo',
            PUBLIC_REPO,
        );
        const runs: unknown = JSON.parse(output);
        if (!Array.isArray(runs)) return undefined;

        const run: unknown = runs[0];
        if (!isRecord(run)) return undefined;

        const ciRun: CiRun = {
            runId: Number(run.databaseId),
            status: String(run.status),
            conclusion: String(run.conclusion),
            url: String(run.url),
        };

        return ciRun;
    }

    // Names each failed step as "job > step", such as "browser > Run npm run test:performance".
    private readFailedSteps(runId: number) {
        const failedSteps: string[] = [];

        for (const job of this.readJobs(runId)) {
            if (!Array.isArray(job.steps)) continue;

            for (const step of job.steps) {
                if (!isRecord(step) || step.conclusion !== 'failure') continue;

                failedSteps.push(`${String(job.name)} > ${String(step.name)}`);
            }
        }

        return failedSteps;
    }

    private readJobs(runId: number) {
        const output = this.gh('run', 'view', String(runId), '--json', 'jobs', '--repo', PUBLIC_REPO);
        const parsed: unknown = JSON.parse(output);
        if (!isRecord(parsed) || !Array.isArray(parsed.jobs)) return [];

        const jobs: unknown[] = parsed.jobs;

        return jobs.filter(isRecord);
    }

    // `gh run view --log-failed` prints "job<TAB>step<TAB>timestamp text" lines. Keeps the
    // end of each failed step, where the test runners print their failures and summary.
    private readFailedLog(runId: number) {
        const output = this.gh('run', 'view', String(runId), '--log-failed', '--repo', PUBLIC_REPO);
        const linesByStep = new Map<string, string[]>();

        for (const rawLine of output.split('\n')) {
            const [jobName, stepName, ...rest] = rawLine.split('\t');
            if (stepName === undefined) continue;

            const text = cleanLogText(rest.join('\t'));
            const stepKey = `${jobName} > ${stepName}`;
            const stepLines = linesByStep.get(stepKey) ?? [];
            stepLines.push(text);
            linesByStep.set(stepKey, stepLines);
        }

        const sections: string[] = [];
        for (const [stepKey, stepLines] of linesByStep) {
            const lastLines = stepLines.slice(-LOG_LINES_PER_STEP);
            sections.push(`== ${stepKey}\n${lastLines.join('\n')}`);
        }

        return sections.join('\n\n');
    }

    private gh(...args: string[]) {
        const output = execFileSync('gh', args, {
            cwd: this.projectFolder,
            encoding: 'utf8',
            maxBuffer: 64 * 1024 * 1024,
        });

        return output.trim();
    }
}

// Such as "5 of 8 jobs done. Running: journeys (1) > Install browsers, 12 min."
export function describeCiProgress(jobs: Record<string, unknown>[], nowMs: number) {
    const doneJobs = jobs.filter((job) => job.status === 'completed');
    const runningJobs = jobs.filter((job) => job.status === 'in_progress');
    const doneText = `${doneJobs.length} of ${jobs.length} jobs done.`;
    if (runningJobs.length === 0) return doneText;

    const runningTexts = runningJobs.map((job) => describeRunningJob(job, nowMs));

    return `${doneText} Running: ${runningTexts.join('; ')}.`;
}

function describeRunningJob(job: Record<string, unknown>, nowMs: number) {
    const jobName = String(job.name);
    if (!Array.isArray(job.steps)) return jobName;

    const steps: unknown[] = job.steps;
    const runningStep = steps.filter(isRecord).find((step) => step.status === 'in_progress');
    if (runningStep === undefined) return jobName;

    const startedAtMs = Date.parse(String(runningStep.startedAt));
    const runningMinutes = Math.floor((nowMs - startedAtMs) / MINUTE_MS);

    return `${jobName} > ${String(runningStep.name)}, ${runningMinutes} min`;
}

const ESCAPE = String.fromCharCode(27);
const BYTE_ORDER_MARK = '﻿';
const ansiColorPattern = new RegExp(`${ESCAPE}\\[[0-9;]*m`, 'g');
const timestampPattern = /^\S+Z /;

function cleanLogText(text: string) {
    const withoutMark = text.replaceAll(BYTE_ORDER_MARK, '');
    const withoutColors = withoutMark.replaceAll(ansiColorPattern, '');
    const withoutTimestamp = withoutColors.replace(timestampPattern, '');

    return withoutTimestamp.trimEnd();
}

import { execFileSync } from 'node:child_process';
import { isRecord } from './RateLimitTracker.ts';

const POLL_INTERVAL_MS = 60 * 1000;
// GitHub can take a moment to start a run after a push.
const RUN_APPEAR_TIMEOUT_MS = 5 * 60 * 1000;
const RUN_FINISH_TIMEOUT_MS = 45 * 60 * 1000;
const LOG_LINES_PER_STEP = 60;

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

// Reads the CI workflow's result for a pushed commit through the `gh` command.
export class CiChecker {
    private readonly projectFolder: string;
    private readonly sleep: Sleep;

    constructor(projectFolder: string, sleep: Sleep) {
        this.projectFolder = projectFolder;
        this.sleep = sleep;
    }

    // Waits until CI on the commit has finished. Never throws: a `gh` error is an unknown result.
    async waitForResult(commit: string): Promise<CiResult> {
        try {
            return await this.waitForRun(commit);
        } catch (error) {
            const reason = error instanceof Error ? error.message.slice(-300) : String(error);
            return { kind: 'unknown', reason };
        }
    }

    private async waitForRun(commit: string): Promise<CiResult> {
        const startedAt = Date.now();

        while (true) {
            const waitedMs = Date.now() - startedAt;
            const run = this.findRun(commit);

            if (run === undefined && waitedMs > RUN_APPEAR_TIMEOUT_MS) {
                return { kind: 'unknown', reason: 'no CI run started for this commit' };
            }
            if (run !== undefined && run.status === 'completed') {
                return this.readResult(commit, run);
            }
            if (waitedMs > RUN_FINISH_TIMEOUT_MS) {
                return { kind: 'unknown', reason: 'CI did not finish within 45 minutes' };
            }

            await this.sleep(POLL_INTERVAL_MS);
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
        const output = this.gh('run', 'view', String(runId), '--json', 'jobs');
        const parsed: unknown = JSON.parse(output);
        const failedSteps: string[] = [];
        if (!isRecord(parsed) || !Array.isArray(parsed.jobs)) return failedSteps;

        for (const job of parsed.jobs) {
            if (!isRecord(job) || !Array.isArray(job.steps)) continue;

            for (const step of job.steps) {
                if (!isRecord(step) || step.conclusion !== 'failure') continue;

                failedSteps.push(`${String(job.name)} > ${String(step.name)}`);
            }
        }

        return failedSteps;
    }

    // `gh run view --log-failed` prints "job<TAB>step<TAB>timestamp text" lines. Keeps the
    // end of each failed step, where the test runners print their failures and summary.
    private readFailedLog(runId: number) {
        const output = this.gh('run', 'view', String(runId), '--log-failed');
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

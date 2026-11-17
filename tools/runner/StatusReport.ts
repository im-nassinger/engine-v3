// v1's stages 0 to 17, then stage 18, the changes in docs/before-v2.md.
const STAGE_COUNT = 19;

export type SessionStatus = 'done' | 'blocked' | 'finished';

export type StatusReport = {
    status: SessionStatus;
    summary: string;
    needs: string;
};

export type RunnerLine = {
    stage: number;
    step: number;
    stepCount: number;
};

const STATUSES: readonly string[] = ['done', 'blocked', 'finished'];

function isSessionStatus(value: string): value is SessionStatus {
    return STATUSES.includes(value);
}

// Reads the block the prompt asks every session to end with.
export function parseStatusReport(finalText: string) {
    const fields = new Map<string, string>();

    for (const line of finalText.split('\n')) {
        const match = /^\s*(STATUS|SUMMARY|NEEDS):\s*(.*)$/.exec(line);
        if (match === null) continue;

        const key = match[1] ?? '';
        const value = match[2] ?? '';
        fields.set(key, value.trim());
    }

    const status = fields.get('STATUS') ?? '';
    if (!isSessionStatus(status)) return undefined;

    const report: StatusReport = {
        status,
        summary: fields.get('SUMMARY') ?? '',
        needs: fields.get('NEEDS') ?? 'none',
    };

    return report;
}

export function hasNeeds(report: StatusReport) {
    const needs = report.needs.trim().toLowerCase();
    return needs !== '' && needs !== 'none';
}

// Reads `**Runner:** stage 7, step 3 of 12` from docs/progress.md, which every session keeps current.
export function parseRunnerLine(progressText: string) {
    const fullMatch = /\*\*Runner:\*\*\s*stage (\d+), step (\d+) of (\d+)/i.exec(progressText);
    if (fullMatch !== null) {
        const runnerLine: RunnerLine = {
            stage: Number(fullMatch[1]),
            step: Number(fullMatch[2]),
            stepCount: Number(fullMatch[3]),
        };
        return runnerLine;
    }

    // `stage 8 is done` means stage 8 is all finished, so the next stage starts with no steps done.
    const doneMatch = /\*\*Runner:\*\*\s*stage (\d+) is (?:done|finished|built|complete)/i.exec(progressText);
    if (doneMatch !== null) {
        const runnerLine: RunnerLine = { stage: Number(doneMatch[1]) + 1, step: 0, stepCount: 0 };
        return runnerLine;
    }

    const stageMatch = /\*\*Runner:\*\*\s*stage (\d+)/i.exec(progressText);
    if (stageMatch === null) return undefined;

    const runnerLine: RunnerLine = { stage: Number(stageMatch[1]), step: 0, stepCount: 0 };
    return runnerLine;
}

// Every stage counts the same, and the current stage counts by its finished steps.
export function percentComplete(runnerLine: RunnerLine, status: SessionStatus) {
    if (status === 'finished') return 100;

    let stageFraction = 0;
    if (runnerLine.stepCount > 0) {
        stageFraction = runnerLine.step / runnerLine.stepCount;
    }

    const stagesDone = runnerLine.stage + stageFraction;
    const percent = (stagesDone / STAGE_COUNT) * 100;

    return Math.min(99, Math.floor(percent));
}

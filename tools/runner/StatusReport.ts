const STAGE_COUNT = 18;

export type SessionStatus = 'done' | 'sudo' | 'blocked' | 'finished';

export type StatusReport = {
    status: SessionStatus;
    stage: number;
    step: number;
    stepCount: number;
    summary: string;
    needs: string;
};

const STATUSES: readonly string[] = ['done', 'sudo', 'blocked', 'finished'];

function isSessionStatus(value: string): value is SessionStatus {
    return STATUSES.includes(value);
}

// Reads the block the prompt asks every session to end with.
export function parseStatusReport(finalText: string) {
    const fields = new Map<string, string>();

    for (const line of finalText.split('\n')) {
        const match = /^\s*(STATUS|STAGE|STEP|SUMMARY|NEEDS):\s*(.*)$/.exec(line);
        if (match === null) continue;

        const key = match[1] ?? '';
        const value = match[2] ?? '';
        fields.set(key, value.trim());
    }

    const status = fields.get('STATUS') ?? '';
    if (!isSessionStatus(status)) return undefined;

    const stage = Number.parseInt(fields.get('STAGE') ?? '', 10);
    const stepMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(fields.get('STEP') ?? '');
    const step = Number(stepMatch?.[1] ?? 0);
    const stepCount = Number(stepMatch?.[2] ?? 0);

    const report: StatusReport = {
        status,
        stage: Number.isNaN(stage) ? 0 : stage,
        step,
        stepCount,
        summary: fields.get('SUMMARY') ?? '',
        needs: fields.get('NEEDS') ?? 'none',
    };

    return report;
}

// Every stage counts the same, and the current stage counts by its finished steps.
export function percentComplete(report: StatusReport) {
    if (report.status === 'finished') return 100;

    let stageFraction = 0;
    if (report.stepCount > 0) {
        stageFraction = report.step / report.stepCount;
    }

    const stagesDone = report.stage + stageFraction;
    const percent = (stagesDone / STAGE_COUNT) * 100;

    return Math.min(99, Math.floor(percent));
}

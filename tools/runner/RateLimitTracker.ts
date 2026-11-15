const WARNING_UTILIZATION = 0.9;

type UsageWindow = {
    name: string;
    utilization: number;
    resetsAtMs: number;
    status: string;
};

export type LimitWarning = {
    windowName: string;
    percentUsed: number;
    resetsAtMs: number;
};

// Reads the rate_limit_event lines that `claude -p --output-format stream-json` prints
// during a session. They come from the CLI, not from the model, so they still arrive
// when the model is cut off by the limit.
export class RateLimitTracker {
    private windows: UsageWindow[] = [];
    private readonly warnedWindows = new Set<string>();

    record(rateLimitInfo: unknown) {
        const windows = readWindows(rateLimitInfo);
        if (windows.length > 0) {
            this.windows = windows;
        }
    }

    isLimitReached() {
        return this.windows.some(isWindowExhausted);
    }

    // When the session can run again: the latest reset among the exhausted windows.
    resumeTimeMs() {
        const exhausted = this.windows.filter(isWindowExhausted);
        if (exhausted.length === 0) return undefined;

        const resetTimes = exhausted.map((window) => window.resetsAtMs);
        return Math.max(...resetTimes);
    }

    describeUsage(formatTime: (timeMs: number) => string) {
        const parts: string[] = [];

        for (const window of this.windows) {
            const percentUsed = Math.round(window.utilization * 100);
            const resetText = formatTime(window.resetsAtMs);
            parts.push(`${window.name}: ${percentUsed}% used, resets ${resetText}`);
        }

        return parts.join('; ');
    }

    clearAfterReset() {
        this.windows = [];
    }

    // Each window is warned about once until it resets.
    takeNewWarnings() {
        const warnings: LimitWarning[] = [];

        for (const window of this.windows) {
            const warningKey = `${window.name}@${window.resetsAtMs}`;
            const nearlyUsedUp = window.utilization >= WARNING_UTILIZATION;
            if (!nearlyUsedUp || this.warnedWindows.has(warningKey)) continue;

            this.warnedWindows.add(warningKey);
            const percentUsed = Math.round(window.utilization * 100);
            warnings.push({ windowName: window.name, percentUsed, resetsAtMs: window.resetsAtMs });
        }

        return warnings;
    }
}

function isWindowExhausted(window: UsageWindow) {
    const isRejected = !window.status.startsWith('allowed');
    const isFull = window.utilization >= 1;

    return isRejected || isFull;
}

function readWindows(rateLimitInfo: unknown) {
    const windows: UsageWindow[] = [];
    if (!isRecord(rateLimitInfo)) return windows;

    const unifiedWindows = rateLimitInfo.unifiedWindows;
    if (!isRecord(unifiedWindows)) return windows;

    for (const [name, value] of Object.entries(unifiedWindows)) {
        if (!isRecord(value)) continue;

        const utilization = value.utilization;
        const resetsAt = value.resetsAt;
        const status = value.status;
        if (typeof utilization !== 'number' || typeof resetsAt !== 'number') continue;

        const statusText = typeof status === 'string' ? status : 'allowed';
        windows.push({ name, utilization, resetsAtMs: resetsAt * 1000, status: statusText });
    }

    return windows;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

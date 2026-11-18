import { spawn } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';
import { isRecord } from './RateLimitTracker.ts';
import type { RateLimitTracker } from './RateLimitTracker.ts';
import { killProcessTree } from './ProcessTree.ts';

const SILENCE_LIMIT_MS = 30 * 60 * 1000;
// The CLI doesn't exit while a background shell it started is still running. On 2026-11-18 a
// session reported its result and then hung for good on a wait loop that never ended.
const EXIT_AFTER_RESULT_LIMIT_MS = 60 * 1000;

export type SessionResult = {
    exitCode: number | null;
    finalText: string;
    isError: boolean;
    apiError: string;
    wentSilent: boolean;
};

type SessionOptions = {
    projectFolder: string;
    prompt: string;
    logFile: string;
    rateLimits: RateLimitTracker;
    onRateLimitEvent: () => void;
    onStarted: (processId: number) => void;
    onActivity: (activity: string) => void;
};

// Runs one fresh `claude -p` session and reads its stream until it ends.
export function runClaudeSession(options: SessionOptions) {
    const args = ['-p', options.prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'auto'];
    const child = spawn('claude', args, { cwd: options.projectFolder, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(options.logFile);

    if (child.pid !== undefined) {
        options.onStarted(child.pid);
    }

    const result: SessionResult = { exitCode: null, finalText: '', isError: false, apiError: '', wentSilent: false };
    let lastAssistantText = '';
    let silenceTimer: NodeJS.Timeout | undefined;
    let exitTimer: NodeJS.Timeout | undefined;

    const endSession = () => {
        if (child.pid === undefined) return;
        killProcessTree(child.pid);
    };

    const restartSilenceTimer = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            result.wentSilent = true;
            endSession();
        }, SILENCE_LIMIT_MS);
    };

    const readLine = (line: string) => {
        log.write(`${line}\n`);
        restartSilenceTimer();

        const event = parseJson(line);
        if (!isRecord(event)) return;

        if (event.type === 'rate_limit_event') {
            options.rateLimits.record(event.rate_limit_info);
            options.onRateLimitEvent();
        }

        if (event.type === 'assistant') {
            const text = readAssistantText(event.message);
            if (text !== '') {
                lastAssistantText = text;
            }

            const activity = readSessionActivity(event.message);
            if (activity !== '') {
                options.onActivity(activity);
            }
        }

        if (event.type === 'result') {
            result.isError = event.is_error === true;
            if (typeof event.api_error === 'string') {
                result.apiError = event.api_error;
            }
            const resultText = event.result;
            if (typeof resultText === 'string') {
                result.finalText = resultText;
            }

            clearTimeout(exitTimer);
            exitTimer = setTimeout(endSession, EXIT_AFTER_RESULT_LIMIT_MS);
        }
    };

    readline.createInterface({ input: child.stdout }).on('line', readLine);
    readline.createInterface({ input: child.stderr }).on('line', (line) => {
        log.write(`STDERR ${line}\n`);
        result.finalText += `\n${line}`;
    });

    restartSilenceTimer();

    return new Promise<SessionResult>((resolve) => {
        child.on('close', (exitCode) => {
            clearTimeout(silenceTimer);
            clearTimeout(exitTimer);
            log.end();

            result.exitCode = exitCode;
            if (result.finalText.trim() === '') {
                result.finalText = lastAssistantText;
            }
            resolve(result);
        });
    });
}

function parseJson(line: string): unknown {
    try {
        return JSON.parse(line);
    } catch {
        return undefined;
    }
}

// The newest thing the session said or started doing.
function readSessionActivity(message: unknown) {
    if (!isRecord(message) || !Array.isArray(message.content)) return '';

    let activity = '';
    for (const block of message.content) {
        const blockActivity = describeContentBlock(block);
        if (blockActivity !== '') {
            activity = blockActivity;
        }
    }

    return activity;
}

function describeContentBlock(block: unknown) {
    if (!isRecord(block)) return '';
    if (block.type === 'text' && typeof block.text === 'string') return block.text;
    if (block.type !== 'tool_use') return '';

    const input = block.input;
    if (isRecord(input) && typeof input.description === 'string') return input.description;

    return `Using ${String(block.name)}`;
}

function readAssistantText(message: unknown) {
    if (!isRecord(message) || !Array.isArray(message.content)) return '';

    const texts: string[] = [];
    for (const block of message.content) {
        if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') {
            texts.push(block.text);
        }
    }

    return texts.join('\n');
}

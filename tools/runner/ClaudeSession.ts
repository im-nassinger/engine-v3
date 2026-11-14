import { spawn } from 'node:child_process';
import fs from 'node:fs';
import readline from 'node:readline';
import { isRecord } from './RateLimitTracker.ts';
import type { RateLimitTracker } from './RateLimitTracker.ts';

const SILENCE_LIMIT_MS = 30 * 60 * 1000;

export type SessionResult = {
    exitCode: number | null;
    finalText: string;
    isError: boolean;
    wentSilent: boolean;
};

type SessionOptions = {
    projectFolder: string;
    prompt: string;
    logFile: string;
    rateLimits: RateLimitTracker;
    onRateLimitEvent: () => void;
};

// Runs one fresh `claude -p` session and reads its stream until it ends.
export function runClaudeSession(options: SessionOptions) {
    const args = ['-p', options.prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'auto'];
    const child = spawn('claude', args, { cwd: options.projectFolder, stdio: ['ignore', 'pipe', 'pipe'] });
    const log = fs.createWriteStream(options.logFile);

    const result: SessionResult = { exitCode: null, finalText: '', isError: false, wentSilent: false };
    let lastAssistantText = '';
    let silenceTimer: NodeJS.Timeout | undefined;

    const restartSilenceTimer = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
            result.wentSilent = true;
            child.kill('SIGTERM');
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
        }

        if (event.type === 'result') {
            result.isError = event.is_error === true;
            const resultText = event.result;
            if (typeof resultText === 'string') {
                result.finalText = resultText;
            }
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

import fs from 'node:fs';
import { TASK } from './StatusReport.ts';

const EVENTS_KEPT = 30;

type SavedStatus = {
    progress: string;
    events: string[];
};

// Writes docs/runner/status.md, so a session that looks after the runner learns
// where it stands from one file. The progress and the recent events are also kept in
// the state folder, so a restart doesn't lose them.
export class StatusFile {
    private readonly filePath: string;
    private readonly savedPath: string;
    private state = 'Starting.';
    private usage = 'Not known yet: it is read from the first session.';
    private saved: SavedStatus = { progress: 'Not known yet.', events: [] };

    constructor(filePath: string, savedPath: string) {
        this.filePath = filePath;
        this.savedPath = savedPath;
        this.load();
    }

    setState(state: string) {
        this.state = state;
        this.write();
    }

    setUsage(usage: string) {
        if (usage === '') return;

        this.usage = usage;
        this.write();
    }

    readProgress() {
        return this.saved.progress;
    }

    setProgress(progress: string) {
        this.saved.progress = progress;
        this.save();
    }

    addEvent(timeText: string, message: string) {
        const oneLine = toOneLine(message);
        this.saved.events.unshift(`${timeText} · ${oneLine}`);
        this.saved.events = this.saved.events.slice(0, EVENTS_KEPT);
        this.save();
    }

    private load() {
        try {
            const savedText = fs.readFileSync(this.savedPath, 'utf8');
            this.saved = JSON.parse(savedText) as SavedStatus;
        } catch {
            // No saved status yet: the runner's first start.
        }
    }

    private save() {
        fs.writeFileSync(this.savedPath, JSON.stringify(this.saved, null, 4));
        this.write();
    }

    private write() {
        const eventLines = this.saved.events.map((event) => `- ${event}`);
        const lines = [
            '# Runner status',
            '',
            '## TL;DR',
            '',
            `Written by the runner itself every time something changes, and not in git. **Now:** ${this.state} **${TASK.name}:** ${this.saved.progress}`,
            '',
            '## Now',
            '',
            this.state,
            '',
            `## ${TASK.name}`,
            '',
            this.saved.progress,
            '',
            '## Usage limit',
            '',
            this.usage,
            '',
            `## The last ${EVENTS_KEPT} events, newest first`,
            '',
            'The same messages the runner sends to Discord, without its ⏳ updates.',
            '',
            ...eventLines,
            '',
        ];

        fs.writeFileSync(this.filePath, lines.join('\n'));
    }
}

function toOneLine(message: string) {
    const withoutCodeFences = message.replaceAll('```', '');
    const words = withoutCodeFences.split(/\s+/);

    return words.join(' ').trim();
}

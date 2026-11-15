import { describe, expect, test } from 'vitest';

import { StatusText } from '../../status/index.ts';
import { ManualTimer } from '../../time/testing/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

import { CommandRunner } from './CommandRunner.ts';

function buildRunner() {
    const timer = new ManualTimer();
    const status = new StatusText(timer);
    const runner = new CommandRunner(status);

    return { timer, status, runner };
}

// A command whose availability and outcome the test sets, counting how often it ran.
function fakeCommand(outcome: CommandOutcome, availability: Availability = { enabled: true }) {
    const command = {
        id: 'test.fake',
        label: 'Fake',
        menu: { menu: 'Edit', section: 1, order: 1 },
        shortcuts: [],
        runCount: 0,
        availability: () => availability,
        run() {
            command.runCount += 1;
            return outcome;
        },
    } satisfies EditorCommand & { runCount: number };

    return command;
}

// A question whose confirm() counts its calls and gives back the outcome the test sets.
function askingOutcome(title: string, afterConfirm: CommandOutcome) {
    const confirmed = { count: 0 };
    const outcome: CommandOutcome = {
        kind: 'needsConfirmation',
        question: { title, text: 'Everything not exported is lost.', confirmLabel: 'Replace' },
        confirm() {
            confirmed.count += 1;
            return afterConfirm;
        },
    };

    return { outcome, confirmed };
}

describe('CommandRunner', () => {
    test('a refused command shows its reason for 4 seconds', () => {
        const { timer, status, runner } = buildRunner();

        runner.run(fakeCommand({ kind: 'refused', reason: "The camera can't be deleted" }));

        expect(status.current).toBe("The camera can't be deleted");

        timer.advance(StatusText.showMs);

        expect(status.current).toBeUndefined();
    });

    test('a disabled command shows its reason and is not run', () => {
        const { status, runner } = buildRunner();
        const command = fakeCommand({ kind: 'done' }, { enabled: false, reason: 'Nothing selected' });

        runner.run(command);

        expect(command.runCount).toBe(0);
        expect(status.current).toBe('Nothing selected');
    });

    test('a done command shows what it did and what it kept', () => {
        const { status, runner } = buildRunner();
        const camera = { id: 2, kind: 'camera' } as const;

        runner.run(fakeCommand({ kind: 'done', text: 'Undid: Hide Square', skipped: [camera] }));

        expect(status.current).toBe('Undid: Hide Square. Camera kept');
    });

    test('a done command with nothing to say leaves the status text alone', () => {
        const { status, runner } = buildRunner();
        status.show('World kept');

        runner.run(fakeCommand({ kind: 'done' }));

        expect(status.current).toBe('World kept');
    });

    test('a question opens as the dialog and runs nothing yet', () => {
        const { status, runner } = buildRunner();
        const { outcome, confirmed } = askingOutcome('Replace the open level?', { kind: 'done' });

        runner.run(fakeCommand(outcome));

        expect(runner.dialog.current?.kind).toBe('question');
        expect(confirmed.count).toBe(0);
        expect(status.current).toBeUndefined();
    });

    test('confirming runs confirm() and shows its outcome', () => {
        const { status, runner } = buildRunner();
        const afterConfirm: CommandOutcome = { kind: 'done', text: 'New level' };
        const { outcome, confirmed } = askingOutcome('Replace the open level?', afterConfirm);

        runner.run(fakeCommand(outcome));
        runner.confirmDialog();

        expect(confirmed.count).toBe(1);
        expect(runner.dialog.current).toBeUndefined();
        expect(status.current).toBe('New level');
    });

    test('a confirmed refusal shows as status text', () => {
        const { status, runner } = buildRunner();
        const { outcome } = askingOutcome('Replace the open level?', { kind: 'refused', reason: 'Too big' });

        runner.run(fakeCommand(outcome));
        runner.confirmDialog();

        expect(status.current).toBe('Too big');
    });

    test('cancelling closes the question and changes nothing', () => {
        const { status, runner } = buildRunner();
        const { outcome, confirmed } = askingOutcome('Replace the open level?', { kind: 'done', text: 'New level' });

        runner.run(fakeCommand(outcome));
        runner.closeDialog();

        expect(confirmed.count).toBe(0);
        expect(runner.dialog.current).toBeUndefined();
        expect(status.current).toBeUndefined();
    });

    test('confirming with no question open, or on a notice, does nothing', () => {
        const { runner } = buildRunner();

        runner.confirmDialog();
        expect(runner.dialog.current).toBeUndefined();

        runner.run(fakeCommand({ kind: 'notice', notice: { title: 'About', text: 'A game' } }));
        runner.confirmDialog();

        expect(runner.dialog.current?.kind).toBe('notice');
    });

    test('a second dialog waits for the first', () => {
        const { runner } = buildRunner();
        const first = askingOutcome('Replace the open level?', { kind: 'done' });
        const second = askingOutcome('Move into another body?', { kind: 'done' });

        runner.run(fakeCommand(first.outcome));
        runner.run(fakeCommand(second.outcome));

        expect(titleOf(runner)).toBe('Replace the open level?');
        expect(runner.dialog.waitingCount).toBe(1);

        runner.confirmDialog();

        expect(first.confirmed.count).toBe(1);
        expect(second.confirmed.count).toBe(0);
        expect(titleOf(runner)).toBe('Move into another body?');

        runner.closeDialog();

        expect(runner.dialog.current).toBeUndefined();
        expect(second.confirmed.count).toBe(0);
    });

    test('a confirmed question can ask another, which opens next', () => {
        const { runner } = buildRunner();
        const inner = askingOutcome('Are you sure?', { kind: 'done' });
        const outer = askingOutcome('Replace the open level?', inner.outcome);

        runner.run(fakeCommand(outer.outcome));
        runner.confirmDialog();

        expect(titleOf(runner)).toBe('Are you sure?');
    });

    test('the dialog version moves when what is on screen changes', () => {
        const { runner } = buildRunner();
        const first = askingOutcome('Replace the open level?', { kind: 'done' });
        const second = askingOutcome('Move into another body?', { kind: 'done' });
        let changes = 0;
        runner.dialog.version.subscribe(() => {
            changes += 1;
        });

        runner.run(fakeCommand(first.outcome));
        runner.run(fakeCommand(second.outcome));

        expect(changes).toBe(1);

        runner.closeDialog();
        runner.closeDialog();

        expect(changes).toBe(3);
    });
});

function titleOf(runner: CommandRunner) {
    const dialog = runner.dialog.current;
    if (dialog?.kind !== 'question') return undefined;

    return dialog.question.title;
}

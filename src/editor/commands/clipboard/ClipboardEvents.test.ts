import { describe, expect, test } from 'vitest';

import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { CommandRunner } from '../running/CommandRunner.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

import { ClipboardEvents } from './ClipboardEvents.ts';

// The command test level with the clipboard events on its own registry, grid snapping off.
function buildEvents() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    const runner = new CommandRunner(built.session.status);
    const events = new ClipboardEvents(built.registry, runner);
    built.session.viewSettings.set('gridSnapping', false);

    return { ...built, runner, events };
}

function entityCount(built: ReturnType<typeof buildEvents>) {
    return built.level.entityCount;
}

describe('ClipboardEvents', () => {
    test('a copy event gets the tagged text, and a paste event of it adds the entities', () => {
        const built = buildEvents();
        const { session, events, square } = built;
        session.openLevel.selection.replace([square.id]);
        const countBefore = entityCount(built);

        const text = events.copy();
        const pasted = events.paste(text ?? '');

        expect(text).toContain('"engine-v3":"entities"');
        expect(pasted).toBe(true);
        expect(entityCount(built)).toBe(countBefore + 1);
        expect(session.openLevel.history.undoLabel).toBe('Paste Square');
    });

    test('a cut event gets the text and deletes in one step', () => {
        const built = buildEvents();
        const { session, events, square } = built;
        session.openLevel.selection.replace([square.id]);

        const text = events.cut();

        expect(text).toContain('"engine-v3":"entities"');
        expect(built.level.findEntity(square.id)).toBeUndefined();
        expect(session.openLevel.history.undoLabel).toBe('Cut Square');
    });

    test('a refused copy or cut gives no text and shows the reason', () => {
        const built = buildEvents();
        const { session, events, level } = built;
        session.openLevel.selection.replace([level.world.id]);

        expect(events.copy()).toBeUndefined();
        expect(session.status.current).toBe("The World can't be copied");
        expect(events.cut()).toBeUndefined();
        expect(session.status.current).toBe("The World can't be cut");
    });

    test('pasting plain text says Nothing to paste and changes nothing', () => {
        const built = buildEvents();
        const countBefore = entityCount(built);

        built.events.paste('plain text');

        expect(built.session.status.current).toBe('Nothing to paste');
        expect(entityCount(built)).toBe(countBefore);
    });

    test('while a dialog is open the events are left to the browser', () => {
        const built = buildEvents();
        const { session, events, runner, square } = built;
        session.openLevel.selection.replace([square.id]);
        runner.dialog.open({ kind: 'notice', notice: { title: 'About', text: 'A game.' } });

        expect(events.copy()).toBeUndefined();
        expect(events.cut()).toBeUndefined();
        expect(events.paste('plain text')).toBe(false);
        expect(built.level.findEntity(square.id)).toBe(square);
    });
});

import { afterEach, describe, expect, test } from 'vitest';

import { Level } from '../../../core/level/index.ts';
import { renameLevel } from '../../../editor/commands/index.ts';
import { SaveIndicator, SaveState } from '../../../editor/saving/index.ts';
import type { SaveMode } from '../../../editor/saving/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';

import { TabTitle, tabTitleText } from './TabTitle.ts';

let disconnect = () => {};

function connectTitle(mode: SaveMode = 'autosave') {
    const timer = new ManualTimer();
    const session = new EditorSession({
        level: Level.createNew(),
        clock: timer.clock,
        timer,
        frames: new ManualFrames(),
    });
    const state = new SaveState();
    const indicator = new SaveIndicator({ state, mode, failureText: () => undefined });
    disconnect = new TabTitle(session, indicator, document).connect();

    return { session, state };
}

afterEach(() => {
    disconnect();
});

describe('TabTitle', () => {
    test('shows the level name, with * in front while unsaved', () => {
        const { state } = connectTitle();
        expect(document.title).toBe('Untitled level - engine-v3');

        state.set('unsaved');
        expect(document.title).toBe('*Untitled level - engine-v3');

        state.set('saved');
        expect(document.title).toBe('Untitled level - engine-v3');
    });

    test('follows renaming, and a level opened later', () => {
        const { session } = connectTitle();

        renameLevel(session.openLevel, 'Castle');
        expect(document.title).toBe('Castle - engine-v3');

        const next = Level.createNew();
        session.replaceOpenLevel(next);
        expect(document.title).toBe('Untitled level - engine-v3');
        renameLevel(session.openLevel, 'Cave');
        expect(document.title).toBe('Cave - engine-v3');
    });

    test('a read-only tab has no *', () => {
        const { state } = connectTitle('readOnly');

        state.set('unsaved');

        expect(document.title).toBe(tabTitleText('Untitled level', false));
    });
});

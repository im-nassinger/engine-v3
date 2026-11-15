import { describe, expect, test } from 'vitest';
import { Level } from '../../../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../../../editor/commands/index.ts';
import { EditorSession } from '../../../editor/session/index.ts';
import { ManualClock, ManualFrames, ManualTimer } from '../../../editor/time/testing/index.ts';
import type { MenuItem } from '../../shared/index.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

import { helpMenuEntries, viewMenuEntries, zoomMenuEntries } from './topBarMenuEntries.ts';

function editorCommands() {
    const session = new EditorSession({
        level: Level.createNew(),
        clock: new ManualClock(),
        timer: new ManualTimer(),
        frames: new ManualFrames(),
    });
    const registry = createCommandRegistry(session);
    const runner = new CommandRunner(session.status);
    const commands: EditorCommands = { registry, runner, platform: 'other' };

    return { session, commands };
}

function labelsOf(items: MenuItem[]) {
    return items.map((item) => (item.kind === 'action' ? item.label : '---'));
}

describe('the top bar menus', () => {
    test('the View menu holds the four switches, each with its shortcut and a tick', () => {
        const { commands } = editorCommands();

        const entries = viewMenuEntries(commands);

        expect(labelsOf(entries)).toEqual(['Grid', 'Joint icons', 'Camera frame', 'Physics view']);
        const shortcuts = entries.map((entry) => (entry.kind === 'action' ? entry.shortcut : undefined));
        expect(shortcuts).toEqual(['G', 'Shift+J', 'Shift+C', 'Shift+P']);
        const ticks = entries.map((entry) => (entry.kind === 'action' ? entry.checked : undefined));
        expect(ticks.every((tick) => typeof tick === 'boolean')).toBe(true);
    });

    test('the zoom menu holds the six zoom commands in the requirement order', () => {
        const { commands } = editorCommands();

        const entries = zoomMenuEntries(commands);

        expect(labelsOf(entries)).toEqual([
            'Zoom in',
            'Zoom out',
            '100%',
            '---',
            'Whole level',
            'Selection',
            'Camera frame',
        ]);
    });

    test('choosing a switch flips it', () => {
        const { session, commands } = editorCommands();
        const gridWasOn = session.viewSettings.isOn('grid');

        const grid = viewMenuEntries(commands)[0];
        if (grid?.kind !== 'action') throw new Error('The View menu starts with Grid.');
        grid.onChoose();

        expect(session.viewSettings.isOn('grid')).toBe(!gridWasOn);
    });

    test('the Help menu holds About', () => {
        const { commands } = editorCommands();

        expect(labelsOf(helpMenuEntries(commands))).toEqual(['About']);
    });
});

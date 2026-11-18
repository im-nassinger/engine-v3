import { describe, expect, test } from 'vitest';
import { CommandRegistry, CommandRunner } from '../../../editor/commands/index.ts';
import type { Availability, EditorCommand, MenuName } from '../../../editor/commands/index.ts';
import { StatusText } from '../../../editor/status/index.ts';
import { ManualTimer } from '../../../editor/time/testing/index.ts';
import type { MenuEntry } from '../../shared/index.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

import { mainMenuEntries } from './mainMenuEntries.ts';

type TestCommandOptions = {
    id: string;
    menu: MenuName;
    section?: number;
    order?: number;
    shortcuts?: string[];
    availability?: Availability;
    checked?: boolean;
};

function testCommand(options: TestCommandOptions) {
    const runs: string[] = [];
    const availability = options.availability ?? { enabled: true };
    const menu = { menu: options.menu, section: options.section ?? 1, order: options.order ?? 10 };

    const command: EditorCommand = {
        id: options.id,
        label: options.id,
        menu,
        shortcuts: options.shortcuts ?? [],
        availability: () => availability,
        run: () => {
            runs.push(options.id);
            return { kind: 'done', text: `Ran ${options.id}` };
        },
    };

    const checked = options.checked;
    if (checked !== undefined) {
        command.checked = () => checked;
    }

    return { command, runs };
}

function buildCommands(commandList: EditorCommand[], platform: 'mac' | 'other' = 'other') {
    const registry = new CommandRegistry();
    for (const command of commandList) {
        registry.register(command);
    }

    const status = new StatusText(new ManualTimer());
    const runner = new CommandRunner(status);
    const commands: EditorCommands = { registry, runner, platform };

    return { commands, status };
}

function submenu(entries: MenuEntry[], label: string) {
    const found = entries.find((entry) => entry.kind === 'submenu' && entry.label === label);
    if (found?.kind !== 'submenu') throw new Error(`No ${label} submenu.`);

    return found.entries;
}

function action(entries: MenuEntry[], id: string) {
    const found = entries.find((entry) => entry.kind === 'action' && entry.id === id);
    if (found?.kind !== 'action') throw new Error(`No ${id} entry.`);

    return found;
}

describe('mainMenuEntries', () => {
    test('submenus come in the fixed order, and an empty one is left out', () => {
        const about = testCommand({ id: 'help.about', menu: 'Help' });
        const undo = testCommand({ id: 'edit.undo', menu: 'Edit' });
        const grid = testCommand({ id: 'view.grid', menu: 'View' });
        const { commands } = buildCommands([about.command, undo.command, grid.command]);

        const entries = mainMenuEntries(commands);
        const labels = entries.map((entry) => (entry.kind === 'submenu' ? entry.label : entry.kind));

        expect(labels).toEqual(['Edit', 'View', 'separator', 'Help']);
    });

    test('Play comes first as a plain entry, with a line under it', () => {
        const play = testCommand({ id: 'play.playOrStop', menu: 'Play', shortcuts: ['Ctrl+Enter'] });
        const newLevel = testCommand({ id: 'file.new', menu: 'File' });
        const about = testCommand({ id: 'help.about', menu: 'Help' });
        const { commands } = buildCommands([about.command, newLevel.command, play.command]);

        const entries = mainMenuEntries(commands);
        const kinds = entries.map((entry) => (entry.kind === 'separator' ? entry.kind : entry.label));

        expect(kinds).toEqual(['play.playOrStop', 'separator', 'File', 'separator', 'Help']);
        expect(action(entries, 'play.playOrStop').shortcut).toBe('Ctrl+Enter');
    });

    test('a line separates sections, in section and order', () => {
        const zoomIn = testCommand({ id: 'zoomIn', menu: 'View', section: 2, order: 10 });
        const grid = testCommand({ id: 'grid', menu: 'View', section: 1, order: 20 });
        const joints = testCommand({ id: 'joints', menu: 'View', section: 1, order: 10 });
        const { commands } = buildCommands([zoomIn.command, grid.command, joints.command]);

        const view = submenu(mainMenuEntries(commands), 'View');
        const kinds = view.map((entry) => (entry.kind === 'action' ? entry.id : entry.kind));

        expect(kinds).toEqual(['joints', 'grid', 'separator', 'zoomIn']);
    });

    test('an entry shows its first shortcut, spelled for the computer', () => {
        const redo = testCommand({ id: 'edit.redo', menu: 'Edit', shortcuts: ['Ctrl+Shift+Z', 'Ctrl+Y'] });

        const onWindows = buildCommands([redo.command], 'other').commands;
        const onMac = buildCommands([redo.command], 'mac').commands;

        const windowsEntry = action(submenu(mainMenuEntries(onWindows), 'Edit'), 'edit.redo');
        const macEntry = action(submenu(mainMenuEntries(onMac), 'Edit'), 'edit.redo');

        expect(windowsEntry.shortcut).toBe('Ctrl+Shift+Z');
        expect(macEntry.shortcut).toBe('Cmd+Shift+Z');
    });

    test('a switch has a tick, and a disabled entry its reason', () => {
        const grid = testCommand({ id: 'view.grid', menu: 'View', checked: true });
        const physics = testCommand({ id: 'view.physicsView', menu: 'View', checked: false });
        const deleting = testCommand({
            id: 'edit.delete',
            menu: 'Edit',
            availability: { enabled: false, reason: 'Nothing selected' },
        });
        const { commands } = buildCommands([grid.command, physics.command, deleting.command]);
        const entries = mainMenuEntries(commands);

        expect(action(submenu(entries, 'View'), 'view.grid').checked).toBe(true);
        expect(action(submenu(entries, 'View'), 'view.physicsView').checked).toBe(false);
        expect(action(submenu(entries, 'Edit'), 'edit.delete').disabledReason).toBe('Nothing selected');
        expect(action(submenu(entries, 'Edit'), 'edit.delete').checked).toBeUndefined();
    });

    test('choosing an entry runs its command through the runner', () => {
        const about = testCommand({ id: 'help.about', menu: 'Help' });
        const { commands, status } = buildCommands([about.command]);

        const entry = action(submenu(mainMenuEntries(commands), 'Help'), 'help.about');
        entry.onChoose();

        expect(about.runs).toEqual(['help.about']);
        expect(status.current).toBe('Ran help.about');
    });
});

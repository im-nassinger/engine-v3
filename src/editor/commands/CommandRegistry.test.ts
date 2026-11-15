import { describe, expect, test } from 'vitest';

import { CommandRegistry } from './CommandRegistry.ts';
import type { EditorCommand, MenuPlace } from './EditorCommand.ts';

function commandAt(id: string, menu: MenuPlace): EditorCommand {
    return {
        id,
        label: id,
        menu,
        shortcuts: [],
        availability: () => ({ enabled: true }),
        run: () => ({ kind: 'done' }),
    };
}

describe('CommandRegistry', () => {
    test('finds a registered command by its id', () => {
        const registry = new CommandRegistry();
        const command = commandAt('edit.undo', { menu: 'Edit', section: 1, order: 10 });

        registry.register(command);

        expect(registry.find('edit.undo')).toBe(command);
        expect(registry.find('edit.redo')).toBeUndefined();
    });

    test('refuses a second command with the same id', () => {
        const registry = new CommandRegistry();
        registry.register(commandAt('edit.undo', { menu: 'Edit', section: 1, order: 10 }));

        const registerAgain = () => registry.register(commandAt('edit.undo', { menu: 'Edit', section: 2, order: 10 }));

        expect(registerAgain).toThrow('edit.undo');
    });

    test('lists a menu by section, then by order, leaving out other menus', () => {
        const registry = new CommandRegistry();
        registry.register(commandAt('late', { menu: 'Edit', section: 2, order: 5 }));
        registry.register(commandAt('second', { menu: 'Edit', section: 1, order: 20 }));
        registry.register(commandAt('other', { menu: 'View', section: 1, order: 1 }));
        registry.register(commandAt('first', { menu: 'Edit', section: 1, order: 10 }));

        const ids = registry.menu('Edit').map((command) => command.id);

        expect(ids).toEqual(['first', 'second', 'late']);
    });
});

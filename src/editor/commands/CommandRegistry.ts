import type { CommandId, EditorCommand, MenuName } from './EditorCommand.ts';

// Every command, by id. The main menu is built from it, so the menu is always the full list.
export class CommandRegistry {
    private readonly commandsById = new Map<CommandId, EditorCommand>();

    register(command: EditorCommand) {
        if (this.commandsById.has(command.id)) {
            throw new Error(`A command with the id ${command.id} is already registered.`);
        }

        this.commandsById.set(command.id, command);
    }

    find(id: CommandId) {
        return this.commandsById.get(id);
    }

    get all(): readonly EditorCommand[] {
        return [...this.commandsById.values()];
    }

    // The menu's commands by section, then by order within it.
    menu(name: MenuName) {
        const inMenu = this.all.filter((command) => command.menu.menu === name);

        return inMenu.sort(compareMenuPlace);
    }
}

function compareMenuPlace(first: EditorCommand, second: EditorCommand) {
    const sectionDifference = first.menu.section - second.menu.section;
    if (sectionDifference !== 0) return sectionDifference;

    return first.menu.order - second.menu.order;
}

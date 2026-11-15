import type { EditorSession } from '../session/index.ts';

import { GoIntoGroupCommand } from './arrange/GoIntoGroupCommand.ts';
import { GroupCommand } from './arrange/GroupCommand.ts';
import { UngroupCommand } from './arrange/UngroupCommand.ts';
import { CommandRegistry } from './CommandRegistry.ts';
import { DeleteCommand } from './edit/DeleteCommand.ts';
import { HideOrShowCommand } from './edit/HideOrShowCommand.ts';
import { RedoCommand } from './edit/RedoCommand.ts';
import { SelectAllCommand } from './edit/SelectAllCommand.ts';
import { UndoCommand } from './edit/UndoCommand.ts';

// Every command built so far, each reading the session's open level when it runs, so replacing the
// open level needs no new registry.
export function createCommandRegistry(session: EditorSession) {
    const registry = new CommandRegistry();

    registry.register(new UndoCommand(session));
    registry.register(new RedoCommand(session));
    registry.register(new DeleteCommand(session));
    registry.register(new SelectAllCommand(session));
    registry.register(new HideOrShowCommand(session));
    registry.register(new GroupCommand(session));
    registry.register(new UngroupCommand(session));
    registry.register(new GoIntoGroupCommand(session));

    return registry;
}

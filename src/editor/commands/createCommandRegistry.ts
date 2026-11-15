import type { EditorSession } from '../session/index.ts';

import { GoIntoGroupCommand } from './arrange/GoIntoGroupCommand.ts';
import { GroupCommand } from './arrange/GroupCommand.ts';
import { UngroupCommand } from './arrange/UngroupCommand.ts';
import { CommandRegistry } from './CommandRegistry.ts';
import { DeleteCommand } from './edit/DeleteCommand.ts';
import { AboutCommand } from './help/AboutCommand.ts';
import { HideOrShowCommand } from './edit/HideOrShowCommand.ts';
import { RedoCommand } from './edit/RedoCommand.ts';
import { SelectAllCommand } from './edit/SelectAllCommand.ts';
import { UndoCommand } from './edit/UndoCommand.ts';
import { FitCameraFrameCommand } from './view/FitCameraFrameCommand.ts';
import { FitSelectionCommand } from './view/FitSelectionCommand.ts';
import { FitWholeLevelCommand } from './view/FitWholeLevelCommand.ts';
import { VIEW_SWITCH_ENTRIES, ViewSwitchCommand } from './view/ViewSwitchCommand.ts';
import { ZoomInCommand } from './view/ZoomInCommand.ts';
import { ZoomOutCommand } from './view/ZoomOutCommand.ts';
import { RenameCommand } from './rename/RenameCommand.ts';
import { ZoomToActualSizeCommand } from './view/ZoomToActualSizeCommand.ts';

// Every command built so far, each reading the session's open level when it runs, so replacing the
// open level needs no new registry.
export function createCommandRegistry(session: EditorSession) {
    const registry = new CommandRegistry();

    registry.register(new UndoCommand(session));
    registry.register(new RedoCommand(session));
    registry.register(new DeleteCommand(session));
    registry.register(new SelectAllCommand(session));
    registry.register(new RenameCommand(session));
    registry.register(new HideOrShowCommand(session));
    registry.register(new GroupCommand(session));
    registry.register(new UngroupCommand(session));
    registry.register(new GoIntoGroupCommand(session));

    for (const entry of VIEW_SWITCH_ENTRIES) {
        registry.register(new ViewSwitchCommand(session, entry));
    }

    registry.register(new ZoomInCommand(session));
    registry.register(new ZoomOutCommand(session));
    registry.register(new ZoomToActualSizeCommand(session));
    registry.register(new FitWholeLevelCommand(session));
    registry.register(new FitSelectionCommand(session));
    registry.register(new FitCameraFrameCommand(session));
    registry.register(new AboutCommand());

    return registry;
}

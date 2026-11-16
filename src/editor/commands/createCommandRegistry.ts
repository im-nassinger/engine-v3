import { EditorClipboard } from '../clipboard/index.ts';
import type { EditorSession } from '../session/index.ts';

import { GoIntoGroupCommand } from './arrange/GoIntoGroupCommand.ts';
import { GroupCommand } from './arrange/GroupCommand.ts';
import { UngroupCommand } from './arrange/UngroupCommand.ts';
import type { ClipboardParts } from './clipboard/ClipboardParts.ts';
import { CopyCommand } from './clipboard/CopyCommand.ts';
import { CutCommand } from './clipboard/CutCommand.ts';
import { DuplicateCommand } from './clipboard/DuplicateCommand.ts';
import { PasteCommand } from './clipboard/PasteCommand.ts';
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
import { NudgeCommand } from './move/NudgeCommand.ts';
import { RenameCommand } from './rename/RenameCommand.ts';
import { ZoomToActualSizeCommand } from './view/ZoomToActualSizeCommand.ts';

// Every command built so far, each reading the session's open level when it runs, so replacing the
// open level needs no new registry. Without clipboard parts, as in most tests, copies stay in memory and
// the mouse is never over the level view.
export function createCommandRegistry(session: EditorSession, clipboardParts?: ClipboardParts) {
    const registry = new CommandRegistry();
    const clipboard = clipboardParts ?? { clipboard: new EditorClipboard(), mouse: { current: undefined } };

    registry.register(new UndoCommand(session));
    registry.register(new RedoCommand(session));
    registry.register(new CutCommand(session, clipboard));
    registry.register(new CopyCommand(session, clipboard));
    registry.register(new PasteCommand(session, clipboard));
    registry.register(new DuplicateCommand(session));
    registry.register(new DeleteCommand(session));
    registry.register(new SelectAllCommand(session));
    registry.register(new RenameCommand(session));
    registry.register(new HideOrShowCommand(session));
    registry.register(new GroupCommand(session));
    registry.register(new UngroupCommand(session));
    registry.register(new GoIntoGroupCommand(session));

    for (const nudge of NudgeCommand.all(session)) {
        registry.register(nudge);
    }

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

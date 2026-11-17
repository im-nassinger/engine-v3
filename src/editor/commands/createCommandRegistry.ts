import { EditorClipboard } from '../clipboard/index.ts';
import type { PlaySession } from '../play/index.ts';
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
import type { EditorCommand } from './EditorCommand.ts';
import { DeleteCommand } from './edit/DeleteCommand.ts';
import { ExportCommand } from './file/ExportCommand.ts';
import type { FileParts } from './file/FileParts.ts';
import { ImportCommand } from './file/ImportCommand.ts';
import { NewCommand } from './file/NewCommand.ts';
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
import { ResizeCommand } from './move/ResizeCommand.ts';
import { RotateCommand } from './move/RotateCommand.ts';
import { PauseOrResumeCommand } from './play/PauseOrResumeCommand.ts';
import { PlayOrStopCommand } from './play/PlayOrStopCommand.ts';
import { StepCommand } from './play/StepCommand.ts';
import { ReadOnlyGuard } from './ReadOnlyGuard.ts';
import { RenameCommand } from './rename/RenameCommand.ts';
import { ZoomToActualSizeCommand } from './view/ZoomToActualSizeCommand.ts';

// Every command built so far, each reading the session's open level when it runs, so replacing the
// open level needs no new registry. Without clipboard parts, as in most tests, copies stay in memory and
// the mouse is never over the level view. Without file parts the File menu's commands aren't registered,
// and without a play session the Play menu's.
export function createCommandRegistry(
    session: EditorSession,
    clipboardParts?: ClipboardParts,
    fileParts?: FileParts,
    play?: PlaySession,
) {
    const registry = new CommandRegistry();
    const clipboard = clipboardParts ?? { clipboard: new EditorClipboard(), mouse: { current: undefined } };
    // In a read-only tab these are disabled with the reason; the rest only look, select or copy.
    const registerEditing = (command: EditorCommand) => registry.register(new ReadOnlyGuard(session, command));

    if (fileParts !== undefined) {
        registerEditing(new NewCommand(session, fileParts));
        // Import checks for a read-only tab itself: dropping a file calls it directly.
        registry.register(new ImportCommand(session, fileParts));
        registry.register(new ExportCommand(session, fileParts));
    }

    registerEditing(new UndoCommand(session));
    registerEditing(new RedoCommand(session));
    // Cut and Paste check for a read-only level themselves: the browser's events call them directly.
    registry.register(new CutCommand(session, clipboard));
    registry.register(new CopyCommand(session, clipboard));
    registry.register(new PasteCommand(session, clipboard));
    registerEditing(new DuplicateCommand(session));
    registerEditing(new DeleteCommand(session));
    registry.register(new SelectAllCommand(session));
    registerEditing(new RenameCommand(session));
    registerEditing(new HideOrShowCommand(session));
    registerEditing(new GroupCommand(session));
    registerEditing(new UngroupCommand(session));
    registry.register(new GoIntoGroupCommand(session));

    for (const nudge of NudgeCommand.all(session)) {
        registerEditing(nudge);
    }
    for (const rotate of RotateCommand.all(session)) {
        registerEditing(rotate);
    }
    for (const resize of ResizeCommand.all(session)) {
        registerEditing(resize);
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
    if (play !== undefined) {
        registry.register(new PlayOrStopCommand(play));
        registry.register(new PauseOrResumeCommand(play));
        registry.register(new StepCommand(play));
    }

    registry.register(new AboutCommand());

    return registry;
}

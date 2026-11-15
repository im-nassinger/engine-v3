import type { EditorSession } from '../../../editor/session/index.ts';
import { useVersion } from '../../hooks/index.ts';

// Redraws whenever anything a command's availability or tick reads may have moved: the history, the
// selection, the current group, the level, the view and its switches, and the open level itself.
// A menu that stays open while the level changes under it shows the change at once. A component
// using it reads commands under a 'use no memo' directive, since the React Compiler would otherwise keep a method
// call's old result for as long as the command object stays the same.
export function useCommandStates(session: EditorSession) {
    const openLevel = session.openLevel;

    useVersion(session.openLevelChanged);
    useVersion(openLevel.history.version);
    useVersion(openLevel.selection.version);
    useVersion(openLevel.currentGroup.version);
    useVersion(openLevel.level.signals.levelVersion);
    useVersion(session.view.version);
    useVersion(session.viewSettings.version);
}

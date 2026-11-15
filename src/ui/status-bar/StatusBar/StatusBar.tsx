import { selectionSummary } from '../../../editor/status/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import './StatusBar.css';

// Left to right: the status text, then the selection. The tool's hint (stage 9) fills the left slot
// while it is empty, and the mouse position (stage 9) and the editor messages' count (stage 8) come
// with their stages.
export function StatusBar() {
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;

    const readStatusText = () => session.status.current ?? '';
    const readSummary = () => selectionSummary(openLevel.selection.entities);

    const statusText = useReading(session.status.version, readStatusText);
    // The summary follows the selection and the names. Each reading redraws only when the text
    // changed, so a drag that moves the level every frame doesn't redraw the bar.
    useReading(openLevel.selection.version, readSummary);
    const summary = useReading(openLevel.level.signals.levelVersion, readSummary);

    return (
        <div className="status-bar" role="status">
            <span className="status-text">{statusText}</span>
            <span className="selection-summary">{summary}</span>
        </div>
    );
}

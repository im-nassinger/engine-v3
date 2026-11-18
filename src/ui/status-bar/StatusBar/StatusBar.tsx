import { mousePositionText, selectionSummary } from '../../../editor/status/index.ts';
import { zoomPercentText } from '../../../editor/view/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import { LevelName, SaveStateButton } from '../../level-file/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { MessagesCount } from './MessagesCount/index.ts';
import './StatusBar.css';

// Left to right: the status text, or the tool's hint while there is none, the mouse position, the zoom,
// which left with the top bar until the debug box shows it (stage 19 step 11), the selection, the editor
// messages' count, then the level's name and the save state, which left with the
// top bar and stay here until stage 19 step 12 takes them off the screen.
export function StatusBar() {
    const session = useEditorSession();
    const { controller, mouse } = useEditorTools();
    useVersion(session.openLevelChanged);
    const openLevel = session.openLevel;

    const readStatusText = () => session.status.current ?? '';
    const readHint = () => controller.hint;
    const readMousePosition = () => mousePositionText(mouse.current);
    const readZoom = () => zoomPercentText(session.view.zoom);
    const readSummary = () => selectionSummary(openLevel.selection.entities);

    const statusText = useReading(session.status.version, readStatusText);
    const hint = useReading(controller.hintVersion, readHint);
    // Moves at most once a frame, however fast the mouse goes.
    const mousePosition = useReading(mouse.version, readMousePosition);
    // Redraws only when the whole percentage changes, so panning doesn't redraw the bar.
    const zoom = useReading(session.view.version, readZoom);
    // The summary follows the selection and the names. Each reading redraws only when the text
    // changed, so a drag that moves the level every frame doesn't redraw the bar.
    useReading(openLevel.selection.version, readSummary);
    const summary = useReading(openLevel.level.signals.levelVersion, readSummary);

    let leftText = statusText;
    if (leftText === '') {
        leftText = hint;
    }

    return (
        <div className="status-bar" role="status">
            <span className="status-text">{leftText}</span>
            <span className="mouse-position">{mousePosition}</span>
            <span className="zoom">{zoom}</span>
            <span className="selection-summary">{summary}</span>
            <MessagesCount openLevel={openLevel} />
            <LevelName />
            <SaveStateButton />
        </div>
    );
}

import type { Level } from '../../../core/level/index.ts';
import { setGridSize } from '../../../editor/commands/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import { mouseCoordinateText } from '../../../editor/status/index.ts';
import { ZOOM_NOT_A_NUMBER, zoomFromPercentText, zoomPercentText } from '../../../editor/view/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { DebugEntry } from './DebugEntry/index.ts';
import { TypedDebugEntry } from './TypedDebugEntry/index.ts';
import './DebugBox.css';

// The mouse position, the grid size and the zoom. The grid size and the zoom can be clicked and typed over
// (owner, 2026-11-19).
export function DebugBox() {
    const session = useEditorSession();
    const { mouse } = useEditorTools();
    useVersion(session.openLevelChanged);
    const level = session.openLevel.level;

    const readMouseX = () => mouseCoordinateText(mouse.current?.x);
    const readMouseY = () => mouseCoordinateText(mouse.current?.y);
    const readGrid = () => gridSizeText(level);
    const readZoom = () => zoomPercentText(session.view.zoom);

    // Moves at most once a frame, however fast the mouse goes.
    const mouseX = useReading(mouse.version, readMouseX);
    const mouseY = useReading(mouse.version, readMouseY);
    const grid = useReading(level.editorData.version, readGrid);
    // Redraws only when the whole percentage changes, so panning doesn't redraw the box.
    const zoom = useReading(session.view.version, readZoom);

    const typeGridSize = (text: string) => typedGridSize(session, text);
    const typeZoom = (text: string) => typedZoom(session, text);

    return (
        <div className="debug-box">
            <DebugEntry label="X" value={mouseX} holdsCoordinate />
            <DebugEntry label="Y" value={mouseY} holdsCoordinate />
            <TypedDebugEntry label="GRID" value={grid} onTyped={typeGridSize} />
            <TypedDebugEntry label="ZOOM" value={zoom} onTyped={typeZoom} />
        </div>
    );
}

// A call, not level.editorData read in place: the React Compiler would keep a closure over the old level
// after New or Import swaps in one with the same grid size.
function gridSizeText(level: Level) {
    return String(level.editorData.gridSize);
}

// Never an undo step; a refusal, such as text that isn't a number, says why in the message pill.
function typedGridSize(session: EditorSession, text: string) {
    const outcome = setGridSize(session.openLevel, text);
    if (outcome.kind === 'refused') {
        session.status.show(outcome.reason);
    }
}

// About the middle of the level view, as the View menu's zoom does, kept inside the zoom range.
function typedZoom(session: EditorSession, text: string) {
    const zoom = zoomFromPercentText(text);
    if (zoom === undefined) {
        session.status.show(ZOOM_NOT_A_NUMBER);
        return;
    }

    session.view.zoomAboutMiddle(zoom);
}

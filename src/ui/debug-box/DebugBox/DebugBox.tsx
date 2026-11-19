import type { Level } from '../../../core/level/index.ts';
import { mouseCoordinateText } from '../../../editor/status/index.ts';
import { zoomPercentText } from '../../../editor/view/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading, useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { DebugEntry } from './DebugEntry/index.ts';
import './DebugBox.css';

// The mouse position, the grid size and the zoom. It only shows them.
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

    return (
        <div className="debug-box">
            <DebugEntry label="X" value={mouseX} holdsCoordinate />
            <DebugEntry label="Y" value={mouseY} holdsCoordinate />
            <DebugEntry label="GRID" value={grid} />
            <DebugEntry label="ZOOM" value={zoom} />
        </div>
    );
}

// A call, not level.editorData read in place: the React Compiler would keep a closure over the old level
// after New or Import swaps in one with the same grid size.
function gridSizeText(level: Level) {
    return String(level.editorData.gridSize);
}

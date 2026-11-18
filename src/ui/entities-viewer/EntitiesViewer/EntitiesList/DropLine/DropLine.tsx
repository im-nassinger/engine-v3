import type { DropTarget } from '../../../../../editor/entities-viewer/index.ts';
import { ROW_HEIGHT, indentAt } from '../rowLayout.ts';
import './DropLine.css';

export type DropLineProps = {
    target: DropTarget;
};

// The line where dragged rows will land, under a row and indented to the depth they land at.
export function DropLine({ target }: DropLineProps) {
    const placement = {
        transform: `translateY(${(target.lineBelowRowIndex + 1) * ROW_HEIGHT}px)`,
        left: `${indentAt(target.lineDepth)}px`,
    };

    return <div className="drop-line" data-depth={target.lineDepth} style={placement} />;
}

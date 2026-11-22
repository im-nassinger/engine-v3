import type { Bounds, Point } from '../../../core/geometry/index.ts';
import type { LevelEditorData } from '../../../core/level/index.ts';
import { gridStepAt } from '../../view/index.ts';
import type { ViewSettings, ViewState } from '../../view/index.ts';
import type { SnapOptions, SnapResult, Snapper } from '../Snapper.ts';

type AxisSnap = {
    readonly correction: number;
    readonly snapped: boolean;
};

const NO_SNAP: AxisSnap = { correction: 0, snapped: false };

// Snaps to the grid lines drawn at the view's zoom, counted from the level's origin. While snapping
// is on, what you move always lands on a line, however far from one it is.
export class GridSnapper implements Snapper {
    private readonly editorData: LevelEditorData;
    private readonly settings: ViewSettings;

    constructor(editorData: LevelEditorData, settings: ViewSettings) {
        this.editorData = editorData;
        this.settings = settings;
    }

    // The moved bounds' left and right (and top and bottom) edges each try their nearest line; the one that
    // needs the smallest correction wins on each axis. The centre is left out: a shape 150 px wide with its
    // centre on a 50 px line would have both edges between lines.
    snapMove(movingBounds: Bounds, offset: Point, view: ViewState, options: SnapOptions): SnapResult {
        if (!this.isOn(options)) return { point: offset, snappedX: false, snappedY: false };

        const step = this.stepAt(view);
        const movedXs = [movingBounds.left + offset.x, movingBounds.right + offset.x];
        const movedYs = [movingBounds.top + offset.y, movingBounds.bottom + offset.y];

        const snapX = nearestSnap(movedXs, step);
        const snapY = nearestSnap(movedYs, step);
        const snappedOffset = { x: offset.x + snapX.correction, y: offset.y + snapY.correction };

        return { point: snappedOffset, snappedX: snapX.snapped, snappedY: snapY.snapped };
    }

    snapPoint(point: Point, view: ViewState, options: SnapOptions): SnapResult {
        if (!this.isOn(options)) return { point, snappedX: false, snappedY: false };

        const step = this.stepAt(view);
        const snapX = nearestSnap([point.x], step);
        const snapY = nearestSnap([point.y], step);
        const snappedPoint = { x: point.x + snapX.correction, y: point.y + snapY.correction };

        return { point: snappedPoint, snappedX: snapX.snapped, snappedY: snapY.snapped };
    }

    private isOn(options: SnapOptions) {
        const switchIsOn = this.settings.isOn('gridSnapping');
        return switchIsOn && !options.ctrlHeld;
    }

    private stepAt(view: ViewState) {
        return gridStepAt(this.editorData.gridSize, view.zoom);
    }
}

// The smallest move that puts one of the positions on a line. The first position wins a tie.
function nearestSnap(positions: readonly number[], step: number) {
    let best = NO_SNAP;
    let bestDistance = Infinity;

    for (const position of positions) {
        const nearestLine = Math.round(position / step) * step;
        const correction = nearestLine - position;
        const distance = Math.abs(correction);
        if (distance >= bestDistance) continue;

        best = { correction, snapped: true };
        bestDistance = distance;
    }

    return best;
}

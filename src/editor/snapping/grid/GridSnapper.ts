import type { Bounds, Point } from '../../../core/geometry/index.ts';
import type { LevelEditorData } from '../../../core/level/index.ts';
import type { ViewSettings, ViewState } from '../../view/index.ts';
import type { SnapOptions, SnapResult, Snapper } from '../Snapper.ts';

// The requirement's snap distance, the same on screen at every zoom.
export const SNAP_DISTANCE_PX = 6;

type AxisSnap = {
    readonly correction: number;
    readonly snapped: boolean;
};

const NO_SNAP: AxisSnap = { correction: 0, snapped: false };

// Snaps to the lines a grid size apart through the level's origin, not the fainter lines between them.
export class GridSnapper implements Snapper {
    private readonly editorData: LevelEditorData;
    private readonly settings: ViewSettings;

    constructor(editorData: LevelEditorData, settings: ViewSettings) {
        this.editorData = editorData;
        this.settings = settings;
    }

    // The moved bounds' left, centre and right (and top, centre and bottom) each try the nearest grid
    // line; the nearest of the three within reach wins on each axis.
    snapMove(movingBounds: Bounds, offset: Point, view: ViewState, options: SnapOptions): SnapResult {
        if (!this.isOn(options)) return { point: offset, snappedX: false, snappedY: false };

        const reach = SNAP_DISTANCE_PX / view.zoom;
        const centre = movingBounds.centre;
        const movedXs = [movingBounds.left + offset.x, centre.x + offset.x, movingBounds.right + offset.x];
        const movedYs = [movingBounds.top + offset.y, centre.y + offset.y, movingBounds.bottom + offset.y];

        const snapX = this.nearestSnap(movedXs, reach);
        const snapY = this.nearestSnap(movedYs, reach);
        const snappedOffset = { x: offset.x + snapX.correction, y: offset.y + snapY.correction };

        return { point: snappedOffset, snappedX: snapX.snapped, snappedY: snapY.snapped };
    }

    snapPoint(point: Point, view: ViewState, options: SnapOptions): SnapResult {
        if (!this.isOn(options)) return { point, snappedX: false, snappedY: false };

        const reach = SNAP_DISTANCE_PX / view.zoom;
        const snapX = this.nearestSnap([point.x], reach);
        const snapY = this.nearestSnap([point.y], reach);
        const snappedPoint = { x: point.x + snapX.correction, y: point.y + snapY.correction };

        return { point: snappedPoint, snappedX: snapX.snapped, snappedY: snapY.snapped };
    }

    private isOn(options: SnapOptions) {
        const switchIsOn = this.settings.isOn('gridSnapping');
        return switchIsOn && !options.ctrlHeld;
    }

    // The smallest move that puts one of the positions on a grid line, if one is within reach. The first
    // position wins a tie.
    private nearestSnap(positions: readonly number[], reach: number) {
        const gridSize = this.editorData.gridSize;
        let best = NO_SNAP;
        let bestDistance = Infinity;

        for (const position of positions) {
            const nearestLine = Math.round(position / gridSize) * gridSize;
            const correction = nearestLine - position;
            const distance = Math.abs(correction);

            const isWithinReach = distance <= reach;
            const isNearer = distance < bestDistance;
            if (!isWithinReach || !isNearer) continue;

            best = { correction, snapped: true };
            bestDistance = distance;
        }

        return best;
    }
}

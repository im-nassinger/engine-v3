import { Matrix2D } from '../../../core/geometry/index.ts';
import type { Bounds, Point, TransformValues } from '../../../core/geometry/index.ts';

// Where a pasted set lands: its box centred on the destination, then, with grid snapping on, moved so the
// box's top left sits on the nearest grid point, as a drawn shape's corners do.
export class PastePlacement {
    // How far the set moves, in level positions.
    readonly offset: Point;

    // The grid size is undefined when grid snapping is off.
    constructor(box: Bounds, destination: Point, gridSize: number | undefined) {
        const centre = box.centre;
        const centredOffset = { x: destination.x - centre.x, y: destination.y - centre.y };

        if (gridSize === undefined) {
            this.offset = centredOffset;
            return;
        }

        const snappedLeft = nearestGridLine(box.left + centredOffset.x, gridSize);
        const snappedTop = nearestGridLine(box.top + centredOffset.y, gridSize);
        this.offset = { x: snappedLeft - box.left, y: snappedTop - box.top };
    }

    // The mouse when it is over the level view, otherwise the view's middle.
    static destinationOf(mouseOverView: Point | undefined, viewMiddle: Point) {
        return mouseOverView ?? viewMiddle;
    }

    // A root's TransformComponent values, written as if its parent were the World, moved by the offset and
    // seen from inside the group it is pasted into. Both matrices are level matrices.
    placeRoot(rootValues: TransformValues, worldMatrix: Matrix2D, groupMatrix: Matrix2D): TransformValues {
        const groupInverse = groupMatrix.invert();
        if (groupInverse === undefined) {
            throw new Error('A group with a scale of 0 has no inside to paste into.');
        }

        const move = new Matrix2D(1, 0, 0, 1, this.offset.x, this.offset.y);
        const rootMatrix = Matrix2D.fromTransform(rootValues);
        const copiedMatrix = worldMatrix.multiply(rootMatrix);
        const movedMatrix = move.multiply(copiedMatrix);
        const localMatrix = groupInverse.multiply(movedMatrix);

        return localMatrix.decompose();
    }
}

function nearestGridLine(position: number, gridSize: number) {
    const lines = Math.round(position / gridSize);

    return lines * gridSize;
}

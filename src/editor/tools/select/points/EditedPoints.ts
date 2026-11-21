import { curveBetween, pathBox, pointOnCubic } from '../../../../core/geometry/index.ts';
import type { Bounds, Matrix2D, PathCorner, PathGeometry, Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import type { OpenLevel } from '../../../session/index.ts';
import { editablePointsOf, geometryBox } from '../../../commands/index.ts';
import type { EditablePoints } from '../../../commands/index.ts';
import { CURVE_STEP_COUNT } from '../../../hit-testing/index.ts';

import { PointHits } from './PointHits.ts';

// The polygon, line or path whose points are being edited, and which of its points are selected, as indexes
// into its points. Calls changed() each time the selected points change, so the overlay draws again.
export class EditedPoints {
    readonly openLevel: OpenLevel;
    readonly entity: Entity;
    private readonly changed: () => void;
    private selected: readonly number[] = [];

    constructor(openLevel: OpenLevel, entity: Entity, changed: () => void) {
        this.openLevel = openLevel;
        this.entity = entity;
        this.changed = changed;
    }

    // Each index once, in order.
    get selectedIndexes() {
        return this.selected;
    }

    isSelected(index: number) {
        return this.selected.includes(index);
    }

    // Still in the level, shown and not locked, a polygon, line or path (not a Rope's or Spring's), and the
    // only one selected.
    get isEditable() {
        const { level, selection, caches } = this.openLevel;
        const isInLevel = level.findEntity(this.entity.id) === this.entity;
        const isOnlySelected = selection.entities.length === 1 && selection.has(this.entity.id);
        const isReachable = !caches.hidden.isHidden(this.entity) && !caches.hidden.isLocked(this.entity);

        return isInLevel && isOnlySelected && isReachable && this.editable() !== undefined;
    }

    get isClosed() {
        return this.editable()?.closed ?? false;
    }

    get isPath() {
        return this.editable()?.kind === 'path';
    }

    // The points in level positions.
    levelPoints(): Point[] {
        const matrix = this.levelMatrix();
        const points = this.editable()?.points ?? [];

        return points.map((point) => matrix.apply(point));
    }

    // Each point's corner, in order: a polygon's and a line's points are all sharp.
    corners(): PathCorner[] {
        const editable = this.editable();
        if (editable === undefined) return [];
        if (editable.kind !== 'path') return editable.points.map(() => 'sharp');

        return editable.points.map((point) => point.corner);
    }

    hits() {
        const editable = this.editable();
        const levelPoints = this.levelPoints();
        if (editable?.kind !== 'path') return new PointHits(levelPoints, this.isClosed);

        return new PointHits(levelPoints, editable.closed, curveSteps(editable.path, this.levelMatrix()));
    }

    // Inside the shape's own box, or on one of its edges, which counts a line's thin box.
    isOnFrame(position: Point, zoom: number) {
        const editable = this.editable();
        const inverse = this.levelMatrix().invert();
        if (editable === undefined || inverse === undefined) return false;

        const ownPosition = inverse.apply(position);
        const isInBox = ownBoxOf(editable).contains(ownPosition);
        const isOnEdge = this.hits().edgeAt(position, zoom) !== undefined;

        return isInBox || isOnEdge;
    }

    pointsInBox(box: Bounds) {
        return this.hits().pointsInBox(box);
    }

    selectOnly(index: number) {
        this.set([index]);
    }

    toggle(index: number) {
        if (this.isSelected(index)) {
            const others = this.selected.filter((selectedIndex) => selectedIndex !== index);
            this.set(others);
            return;
        }

        this.set([...this.selected, index]);
    }

    add(indexes: readonly number[]) {
        this.set([...this.selected, ...indexes]);
    }

    replace(indexes: readonly number[]) {
        this.set(indexes);
    }

    clear() {
        this.set([]);
    }

    // Leaves out the selected points the entity no longer has.
    dropMissing() {
        const count = this.editable()?.points.length ?? 0;
        const remaining = this.selected.filter((index) => index < count);
        this.set(remaining);
    }

    private editable() {
        return editablePointsOf(this.entity);
    }

    private levelMatrix() {
        return this.openLevel.caches.worldMatrices.matrixOf(this.entity);
    }

    private set(indexes: readonly number[]) {
        const unique = [...new Set(indexes)];
        const inOrder = unique.sort((a, b) => a - b);
        const isSame =
            inOrder.length === this.selected.length && inOrder.every((index, i) => index === this.selected[i]);
        if (isSame) return;

        this.selected = inOrder;
        this.changed();
    }
}

function ownBoxOf(editable: EditablePoints) {
    const box = editable.kind === 'path' ? pathBox(editable.path) : geometryBox(editable);
    if (box === undefined) throw new Error('Edited points are never empty.');

    return box;
}

// Each of the path's edges in level positions, from its start point to the next: a straight one as its
// two ends, a curve as the steps hit testing cuts it into.
function curveSteps(path: PathGeometry, matrix: Matrix2D) {
    const { points, closed } = path;
    const edgeCount = closed ? points.length : points.length - 1;
    const edges: Point[][] = [];

    for (let startIndex = 0; startIndex < edgeCount; startIndex += 1) {
        const from = points[startIndex];
        const to = points[(startIndex + 1) % points.length];
        if (from === undefined || to === undefined) break;

        const curve = curveBetween(from, to);
        const isStraight = from.handleOut === null && to.handleIn === null;
        const stepCount = isStraight ? 1 : CURVE_STEP_COUNT;
        const steps = Array.from({ length: stepCount + 1 }, (_unused, step) =>
            matrix.apply(pointOnCubic(curve, step / stepCount)),
        );
        edges.push(steps);
    }

    return edges;
}

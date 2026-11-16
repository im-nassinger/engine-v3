import { ShapeComponent } from '../../../../core/components/index.ts';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import type { OpenLevel } from '../../../session/index.ts';
import { geometryBox } from '../frame/SelectionFrame.ts';

import { PointHits } from './PointHits.ts';

// The polygon or line whose points are being edited, and which of its points are selected, as indexes
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

    // Still in the level, shown and not locked, a polygon or line, and the only one selected.
    get isEditable() {
        const { level, selection, caches } = this.openLevel;
        const isInLevel = level.findEntity(this.entity.id) === this.entity;
        const isOnlySelected = selection.entities.length === 1 && selection.has(this.entity.id);
        const isReachable = !caches.hidden.isHidden(this.entity) && !caches.hidden.isLocked(this.entity);

        return isInLevel && isOnlySelected && isReachable && this.points() !== undefined;
    }

    get isClosed() {
        return this.geometry()?.kind === 'polygon';
    }

    // The points in level positions.
    levelPoints(): Point[] {
        const matrix = this.openLevel.caches.worldMatrices.matrixOf(this.entity);
        const points = this.points() ?? [];

        return points.map((point) => matrix.apply(point));
    }

    hits() {
        const levelPoints = this.levelPoints();

        return new PointHits(levelPoints, this.isClosed);
    }

    // Inside the shape's own box, or on one of its edges, which counts a line's thin box.
    isOnFrame(position: Point, zoom: number) {
        const geometry = this.geometry();
        const inverse = this.openLevel.caches.worldMatrices.matrixOf(this.entity).invert();
        if (geometry === undefined || inverse === undefined) return false;

        const ownPosition = inverse.apply(position);
        const isInBox = geometryBox(geometry).contains(ownPosition);
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
        const count = this.points()?.length ?? 0;
        const remaining = this.selected.filter((index) => index < count);
        this.set(remaining);
    }

    private geometry() {
        return this.entity.getComponent(ShapeComponent)?.get('geometry');
    }

    private points() {
        const geometry = this.geometry();
        const hasPoints = geometry?.kind === 'polygon' || geometry?.kind === 'line';
        if (!hasPoints) return undefined;

        return geometry.points;
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

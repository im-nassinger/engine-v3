import { CameraComponent, JointComponent, ShapeComponent } from '../../../../core/components/index.ts';
import type { Bounds, Matrix2D, Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { ownBox } from '../../../commands/index.ts';
import type { OpenLevel } from '../../../session/index.ts';

import { FRAME_HANDLES, HANDLE_GRAB_PX, HANDLE_SIZE_PX, ROTATE_AREA_PX } from './FrameHandle.ts';
import type { FrameHandle } from './FrameHandle.ts';

// What a resize changes: a shape's or a group's scale, the World its rectangle from the centre.
export type FrameKind = 'shape' | 'group' | 'world';

// The box with the eight handles around one selected entity, along its own sides: a box in the entity's
// own space and the matrix that takes it to level positions. Several entities, a locked or hidden one,
// the camera and a joint have no handles in v1.
export class SelectionFrame {
    readonly entity: Entity;
    readonly kind: FrameKind;
    // In the entity's own space, before its TransformComponent.
    readonly box: Bounds;
    // The entity's own space to level positions.
    readonly matrix: Matrix2D;
    // Level positions to the entity's own space.
    readonly inverse: Matrix2D;

    private constructor(entity: Entity, kind: FrameKind, box: Bounds, matrix: Matrix2D, inverse: Matrix2D) {
        this.entity = entity;
        this.kind = kind;
        this.box = box;
        this.matrix = matrix;
        this.inverse = inverse;
    }

    static of(openLevel: OpenLevel): SelectionFrame | undefined {
        const { selection, caches, level } = openLevel;
        const only = selection.entities.length === 1 ? selection.entities[0] : undefined;
        if (only === undefined) return undefined;

        const hasNoHandles = caches.hidden.isLocked(only) || caches.hidden.isHidden(only);
        if (hasNoHandles) return undefined;

        const matrix = caches.worldMatrices.matrixOf(only);
        const inverse = matrix.invert();
        if (inverse === undefined) return undefined;

        const kind = kindOf(only, level.world);
        if (kind === undefined) return undefined;

        const box = ownBox(openLevel, only);
        if (box === undefined) return undefined;

        return new SelectionFrame(only, kind, box, matrix, inverse);
    }

    // In the entity's own space.
    handleInBox(handle: FrameHandle): Point {
        const centre = this.box.centre;

        return {
            x: centre.x + (handle.x * this.box.width) / 2,
            y: centre.y + (handle.y * this.box.height) / 2,
        };
    }

    handlePosition(handle: FrameHandle): Point {
        return this.matrix.apply(this.handleInBox(handle));
    }

    // The eight handles' middles in level positions, in FRAME_HANDLES' order.
    get handles(): Point[] {
        return FRAME_HANDLES.map((handle) => this.handlePosition(handle));
    }

    // The four corners in level positions, clockwise from the top left of the entity's own space.
    get corners(): Point[] {
        return this.box.corners().map((corner) => this.matrix.apply(corner));
    }

    // The handle nearest the point within its square and grab margin, on screen, or undefined.
    handleAt(point: Point, zoom: number): FrameHandle | undefined {
        const reach = HANDLE_SIZE_PX / 2 + HANDLE_GRAB_PX;
        let nearest: FrameHandle | undefined;
        let nearestDistance = Infinity;

        for (const handle of FRAME_HANDLES) {
            const position = this.handlePosition(handle);
            const dx = Math.abs(point.x - position.x) * zoom;
            const dy = Math.abs(point.y - position.y) * zoom;
            const distance = Math.max(dx, dy);
            if (distance > reach || distance >= nearestDistance) continue;

            nearest = handle;
            nearestDistance = distance;
        }

        return nearest;
    }

    // Whether the point lies in the 16 screen px square just outside a corner, and on no handle. The World
    // never turns, so it has none.
    isOnRotateArea(point: Point, zoom: number): boolean {
        if (this.kind === 'world') return false;
        if (this.handleAt(point, zoom) !== undefined) return false;

        // Screen px per own unit along each own axis.
        const { a, b, c, d } = this.matrix;
        const across = Math.hypot(a, b) * zoom;
        const down = Math.hypot(c, d) * zoom;
        const own = this.inverse.apply(point);
        const { box } = this;

        // Outward from the nearest side on each axis, in screen px: below 0 is inside the frame.
        const outX = Math.max(box.left - own.x, own.x - box.right) * across;
        const outY = Math.max(box.top - own.y, own.y - box.bottom) * down;
        const isNearCorner = outX >= 0 && outY >= 0;

        return isNearCorner && outX <= ROTATE_AREA_PX && outY <= ROTATE_AREA_PX;
    }
}

function kindOf(entity: Entity, world: Entity): FrameKind | undefined {
    const hasShape = entity.hasComponent(ShapeComponent);
    if (entity === world) return hasShape ? 'world' : undefined;

    const hasNoHandles = entity.hasComponent(CameraComponent) || entity.hasComponent(JointComponent);
    if (hasNoHandles) return undefined;

    if (hasShape) return 'shape';
    if (entity.children.length > 0) return 'group';

    return undefined;
}

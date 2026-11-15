import { CameraComponent, JointComponent, ShapeComponent } from '../../../../core/components/index.ts';
import { OwnBounds } from '../../../../core/derived/index.ts';
import { Bounds } from '../../../../core/geometry/index.ts';
import type { Matrix2D, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import type { OpenLevel } from '../../../session/index.ts';

import { FRAME_HANDLES, HANDLE_GRAB_PX, HANDLE_SIZE_PX } from './FrameHandle.ts';
import type { FrameHandle } from './FrameHandle.ts';

// What a resize changes: a shape its width and height, a group its scale, the World its rectangle from
// the centre.
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

        const box = kind === 'group' ? groupBox(openLevel, only, inverse) : shapeBox(only);
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

function shapeBox(entity: Entity) {
    const geometry = entity.requireComponent(ShapeComponent).get('geometry');

    return geometryBox(geometry);
}

// A shape's own bounds, its outline left out: the box resizing measures.
export function geometryBox(geometry: ShapeGeometry): Bounds {
    switch (geometry.kind) {
        case 'rectangle':
            return new Bounds(-geometry.width / 2, -geometry.height / 2, geometry.width / 2, geometry.height / 2);
        case 'circle':
            return new Bounds(-geometry.radius, -geometry.radius, geometry.radius, geometry.radius);
        case 'polygon':
        case 'line': {
            const bounds = Bounds.around(geometry.points);
            if (bounds === undefined) throw new Error('A polygon or line has points.');

            return bounds;
        }
    }
}

// What the group's visible descendants draw, in the group's own space.
function groupBox(openLevel: OpenLevel, group: Entity, inverse: Matrix2D) {
    const { caches } = openLevel;
    let box: Bounds | undefined;

    const visit = (entity: Entity) => {
        for (const child of entity.children) {
            if (caches.hidden.isHidden(child)) continue;

            const inGroupSpace = inverse.multiply(caches.worldMatrices.matrixOf(child));
            const childBox = OwnBounds.of(child, inGroupSpace);
            if (childBox !== undefined) {
                box = box === undefined ? childBox : box.union(childBox);
            }
            visit(child);
        }
    };
    visit(group);

    return box;
}

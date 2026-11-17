import { ShapeComponent } from '../../../core/components/index.ts';
import { OwnBounds } from '../../../core/derived/index.ts';
import { Bounds } from '../../../core/geometry/index.ts';
import type { Matrix2D, ShapeGeometry } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// The box an entity turns and resizes around, in its own space, before its TransformComponent: a shape's
// own bounds, or what a group's visible descendants draw. undefined for anything else, such as an empty
// group, a joint or the camera, and under a scale of 0, where no box shows.
export function ownBox(openLevel: OpenLevel, entity: Entity): Bounds | undefined {
    const shape = entity.getComponent(ShapeComponent);
    if (shape !== undefined) return geometryBox(shape.get('geometry'));
    if (entity.children.length === 0) return undefined;

    const inverse = openLevel.caches.worldMatrices.matrixOf(entity).invert();
    if (inverse === undefined) return undefined;

    return groupBox(openLevel, entity, inverse);
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

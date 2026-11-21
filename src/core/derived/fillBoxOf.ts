import { PathComponent, ShapeComponent } from '../components/index.ts';
import type { Entity } from '../level/index.ts';
import { Bounds, pathBox } from '../geometry/index.ts';
import type { ShapeGeometry } from '../geometry/index.ts';

function shapeBox(geometry: ShapeGeometry) {
    switch (geometry.kind) {
        case 'rectangle':
            return new Bounds(-geometry.width / 2, -geometry.height / 2, geometry.width / 2, geometry.height / 2);
        case 'circle':
            return new Bounds(-geometry.radius, -geometry.radius, geometry.radius, geometry.radius);
        case 'polygon':
        case 'line':
            return Bounds.around(geometry.points);
    }
}

// The box a fill's positions are shares of, in the entity's own space: its geometry with the outline left
// out, so an outline width never moves a gradient. A path counts before a shape, as it is drawn. undefined
// for an entity with neither, or with no points.
export function fillBoxOf(entity: Entity) {
    const pathComponent = entity.getComponent(PathComponent);
    if (pathComponent !== undefined) return pathBox(pathComponent.get('path'));

    const shape = entity.getComponent(ShapeComponent);
    if (shape === undefined) return undefined;

    return shapeBox(shape.get('geometry'));
}

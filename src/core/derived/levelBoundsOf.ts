import { ShapeComponent } from '../components/index.ts';
import type { Level } from '../entities/index.ts';
import { Bounds } from '../geometry/index.ts';

// The level bounds: the World's rectangle, centred on the level's origin. The World's TransformComponent is
// never shown or changed, so the rectangle's own position is its level position. undefined when the World
// has no rectangle, which only a level still being read can have.
export function levelBoundsOf(level: Level) {
    const shape = level.world.getComponent(ShapeComponent);
    if (shape === undefined) return undefined;

    const geometry = shape.get('geometry');
    if (geometry.kind !== 'rectangle') return undefined;

    const halfWidth = geometry.width / 2;
    const halfHeight = geometry.height / 2;

    return new Bounds(-halfWidth, -halfHeight, halfWidth, halfHeight);
}

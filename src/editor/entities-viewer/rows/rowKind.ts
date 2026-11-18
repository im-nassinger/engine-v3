import { JointComponent, PathComponent, ShapeComponent } from '../../../core/components/index.ts';
import type { JointType } from '../../../core/components/index.ts';
import type { ShapeKind } from '../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../core/level/index.ts';

export type RowKind = 'world' | 'camera' | `${JointType}-joint` | ShapeKind | 'path' | 'group' | 'entity';

// Which icon a row shows. An entity has no kind field, so its components decide, in a fixed order.
export function rowKind(entity: Entity, level: Level): RowKind {
    if (entity === level.world) return 'world';
    if (entity === level.camera) return 'camera';

    const joint = entity.getComponent(JointComponent);
    if (joint !== undefined) {
        const jointType = joint.get('type');
        return `${jointType}-joint`;
    }

    const shape = entity.getComponent(ShapeComponent);
    if (shape !== undefined) {
        const geometry = shape.get('geometry');
        return geometry.kind;
    }

    if (entity.hasComponent(PathComponent)) return 'path';

    const hasChildren = entity.children.length > 0;
    if (hasChildren) return 'group';

    return 'entity';
}

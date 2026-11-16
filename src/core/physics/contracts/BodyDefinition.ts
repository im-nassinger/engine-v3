import type { BodyType } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';

// One body for the physics world, in pixels and degrees. The angle is clockwise on screen, like a
// TransformComponent's rotation. The entity is the body's own, so the world can name it in its reports.
export type BodyDefinition = {
    readonly entity: EntityId;
    readonly type: BodyType;
    readonly position: Point;
    readonly angle: number;
    readonly gravityScale: number;
    readonly linearDamping: number;
    readonly angularDamping: number;
    readonly fixedRotation: boolean;
    readonly bullet: boolean;
};

import { JointComponent } from '../../core/components/index.ts';
import type { Matrix2D, Point } from '../../core/geometry/index.ts';
import type { Entity } from '../../core/level/index.ts';

// Where a joint's icons sit in the level, given the joint's level matrix: a Hinge has one, at its position;
// a Rope or Spring has one on each of its two ends, A first, so either end can be grabbed (owner,
// 2026-11-21). Empty for an entity with no JointComponent. The level view draws them and HitTester hits them.
export function jointIconCentres(entity: Entity, matrix: Matrix2D): Point[] {
    const joint = entity.getComponent(JointComponent);
    if (joint === undefined) return [];
    if (joint.get('type') === 'hinge') return [{ x: matrix.tx, y: matrix.ty }];

    const ends = joint.get('ends');

    return [matrix.apply(ends.a), matrix.apply(ends.b)];
}

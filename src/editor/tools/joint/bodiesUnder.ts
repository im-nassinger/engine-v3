import { JointComponent, SurfaceComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMembership } from '../../../core/physics/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// What a joint can join under a point: the bodies, front to back, and the entities hit that belong to
// them, which the ends snap to.
export type BodiesUnder = {
    readonly bodies: readonly Entity[];
    readonly hits: readonly Entity[];
};

// Each hit becomes the body it moves with in play, or itself for a surface with no body, so two merged
// shapes of one car count once. Hits with neither have no physics and are skipped, and so are joints. The
// HitTester has already passed through hidden and locked entities.
export function bodiesUnder(openLevel: OpenLevel, point: Point, zoom: number): BodiesUnder {
    const { level, hitTester, currentGroup } = openLevel;
    const membership = new BodyMembership(level);
    const bodies: Entity[] = [];
    const hits: Entity[] = [];

    for (const hit of hitTester.allAt(point, { zoom, currentGroup: currentGroup.group })) {
        if (hit.hasComponent(JointComponent)) continue;

        const body = membership.bodyOf(hit) ?? (hit.hasComponent(SurfaceComponent) ? hit : undefined);
        if (body === undefined) continue;

        hits.push(hit);
        if (!bodies.includes(body)) {
            bodies.push(body);
        }
    }

    return { bodies, hits };
}

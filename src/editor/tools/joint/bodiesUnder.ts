import { JointComponent, SurfaceComponent } from '../../../core/components/index.ts';
import type { DerivedCaches } from '../../../core/derived/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMembership } from '../../../core/physics/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// What a joint can join under a point: the bodies, front to back, and the entities hit that belong to
// them, which the ends snap to. skipped is why the frontmost entity the tool skips can't take a joint,
// such as "Platform is hidden", for the preview's label and the status text.
export type BodiesUnder = {
    readonly bodies: readonly Entity[];
    readonly hits: readonly Entity[];
    readonly skipped: string | undefined;
};

// Each hit becomes the body it moves with in play, or itself for a surface with no body, so two merged
// shapes of one car count once. Hidden and locked entities, and hits with neither a body nor a surface, are
// skipped with a reason. Joints are skipped without one: their icons sit over the bodies they join.
export function bodiesUnder(openLevel: OpenLevel, point: Point, zoom: number): BodiesUnder {
    const { level, hitTester, currentGroup, caches } = openLevel;
    const membership = new BodyMembership(level);
    const bodies: Entity[] = [];
    const hits: Entity[] = [];
    let skipped: string | undefined;
    const probe = { zoom, currentGroup: currentGroup.group, reachHiddenAndLocked: true };

    for (const hit of hitTester.allAt(point, probe)) {
        if (hit.hasComponent(JointComponent)) continue;

        const body = membership.bodyOf(hit) ?? (hit.hasComponent(SurfaceComponent) ? hit : undefined);
        const why = whySkipped(hit, caches);
        if (why !== undefined || body === undefined) {
            skipped ??= `${labelName(hit)} ${why ?? 'has no BodyComponent'}`;
            continue;
        }

        hits.push(hit);
        if (!bodies.includes(body)) {
            bodies.push(body);
        }
    }

    return { bodies, hits, skipped };
}

function whySkipped(hit: Entity, caches: DerivedCaches) {
    if (caches.hidden.isHidden(hit)) return 'is hidden';
    if (caches.hidden.isLocked(hit)) return 'is locked';

    return undefined;
}

import { BodyComponent } from '../../../core/components/index.ts';
import { MassProperties } from '../../../core/geometry/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { BodyMass } from '../../../core/physics/index.ts';
import type { BodyMassCaches } from '../../../core/physics/index.ts';

// One end of a joint being placed: the body, or a surface with no body, and the point clicked on it, in
// level positions.
export type JointEnd = {
    readonly body: Entity;
    readonly at: Point;
};

// The smaller body by area is A, whatever the draw order; on a tie the first given is. Each end keeps its
// point, so for a Rope or Spring swapping A and B swaps their ends too. Area, not mass: a small heavy wheel
// still looks like the smaller one.
export function pickBodyA(first: JointEnd, second: JointEnd, caches: BodyMassCaches) {
    const secondIsSmaller = areaOf(second.body, caches) < areaOf(first.body, caches);

    return secondIsSmaller ? { a: second, b: first } : { a: first, b: second };
}

// A body's area is BodyMass's, every surface it holds; a surface with no body has its own pieces' area.
export function areaOf(body: Entity, caches: BodyMassCaches) {
    if (body.hasComponent(BodyComponent)) return BodyMass.of(body, caches)?.area ?? 0;

    const pieces = caches.pieces.piecesOf(body)?.pieces ?? [];
    const matrix = caches.worldMatrices.matrixOf(body);

    return MassProperties.of(pieces, 1).transformedBy(matrix).area;
}

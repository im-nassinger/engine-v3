import type { JointComponent } from '../../components/index.ts';
import type { Matrix2D, Point } from '../../geometry/index.ts';

import type { BodyHandle } from '../contracts/Handles.ts';
import type { JointDefinition } from '../contracts/JointDefinition.ts';

// The two bodies a joint joins in play, A first. Either may be the ground body.
export type JointBodies = {
    readonly bodyA: BodyHandle;
    readonly bodyB: BodyHandle;
};

// The definition play hands the physics world for one joint, from its level matrix. A Hinge uses only
// end A, for both bodies. A typed Length or Rest length is in the joint's own space, so it is multiplied by
// the joint's scale; a mirrored joint turns the other way, so its limits and motor are flipped.
export function jointDefinitionOf(
    entity: number,
    joint: JointComponent,
    levelMatrix: Matrix2D,
    bodies: JointBodies,
): JointDefinition {
    const ends = joint.get('ends');
    const endA = levelMatrix.apply(ends.a);
    const shared = {
        entity,
        bodyA: bodies.bodyA,
        bodyB: bodies.bodyB,
        endA,
        letConnectedObjectsCollide: joint.get('letConnectedObjectsCollide'),
    };
    const type = joint.get('type');

    if (type === 'hinge') {
        const mirrored = levelMatrix.determinant() < 0;
        const minAngle = joint.get('minAngle');
        const maxAngle = joint.get('maxAngle');
        const motorSpeed = joint.get('motorSpeed');

        return {
            ...shared,
            type,
            endB: endA,
            limitRotation: joint.get('limitRotation'),
            minAngle: mirrored ? -maxAngle : minAngle,
            maxAngle: mirrored ? -minAngle : maxAngle,
            motor: joint.get('motor'),
            motorSpeed: mirrored ? -motorSpeed : motorSpeed,
            motorStrength: joint.get('motorStrength'),
            resistance: joint.get('resistance'),
        };
    }

    const endB = levelMatrix.apply(ends.b);
    const matchDrawn = joint.get('matchDrawnDistance');
    // The geometric mean of the two scales, which a skewed or unevenly scaled joint needs too.
    const scale = Math.sqrt(Math.abs(levelMatrix.determinant()));
    const lengthOf = (typed: number) => (matchDrawn ? distance(endA, endB) : typed * scale);

    if (type === 'rope') {
        return { ...shared, type, endB, length: lengthOf(joint.get('length')) };
    }

    return {
        ...shared,
        type,
        endB,
        restLength: lengthOf(joint.get('restLength')),
        stiffness: joint.get('stiffness'),
        damping: joint.get('damping'),
    };
}

// Not Math.hypot, which IEEE 754 doesn't define exactly, so it may differ between browsers.
function distance(a: Point, b: Point) {
    const x = b.x - a.x;
    const y = b.y - a.y;

    return Math.sqrt(x * x + y * y);
}

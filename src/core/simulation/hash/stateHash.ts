import type { Point } from '../../geometry/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

import { bodyNumbers, NUMBERS_PER_BODY } from './bodyNumbers.ts';
import { fnv1a } from './fnv1a.ts';

// FNV-1a over the bytes of the tick, then each body still in the run's id, position, angle, speed and spin
// in Entities panel order, then the camera, as 8 hex digits. Any one bit that differs changes it.
export function stateHash(tick: number, scene: PhysicsScene, poses: BodyPoses, camera: Point) {
    const bodies = bodyNumbers(scene, poses);
    const numbers = new Float64Array(1 + bodies.length * NUMBERS_PER_BODY + 2);
    numbers[0] = tick;
    let offset = 1;

    for (const body of bodies) {
        numbers.set(body.numbers, offset);
        offset += NUMBERS_PER_BODY;
    }

    numbers[offset] = camera.x;
    numbers[offset + 1] = camera.y;

    return fnv1a(numbers);
}

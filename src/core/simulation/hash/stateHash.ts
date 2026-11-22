import type { Point } from '../../geometry/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

import { bodyNumbers, NUMBERS_PER_BODY } from './bodyNumbers.ts';
import { fnv1a } from './fnv1a.ts';

// FNV-1a over the bytes of the tick, then each body still in the run's id, position, angle, speed and spin
// in Entities panel order, then the camera, then the World's variables' values in their list order, as 8 hex
// digits. Any one bit that differs changes it. A level with no variables adds nothing, so its hashes are those
// recorded before v3.
export function stateHash(
    tick: number,
    scene: PhysicsScene,
    poses: BodyPoses,
    camera: Point,
    variables: readonly number[],
) {
    const bodies = bodyNumbers(scene, poses);
    const numbers = new Float64Array(1 + bodies.length * NUMBERS_PER_BODY + 2 + variables.length);
    numbers[0] = tick;
    let offset = 1;

    for (const body of bodies) {
        numbers.set(body.numbers, offset);
        offset += NUMBERS_PER_BODY;
    }

    numbers[offset] = camera.x;
    numbers[offset + 1] = camera.y;
    numbers.set(variables, offset + 2);

    return fnv1a(numbers);
}

import type { Point } from '../../geometry/index.ts';
import type { BodyPoses, PhysicsScene } from '../../physics/index.ts';

const NUMBERS_PER_BODY = 7;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

// FNV-1a over the bytes of the tick, then each body still in the run's id, position, angle, speed and spin
// in Entities panel order, then the camera, as 8 hex digits. Any one bit that differs changes it.
export function stateHash(tick: number, scene: PhysicsScene, poses: BodyPoses, camera: Point) {
    // A removed body has no pose.
    const bodies = scene.bodies.filter((body) => poses.poseOf(body.entity.id) !== undefined);
    const numbers = new Float64Array(1 + bodies.length * NUMBERS_PER_BODY + 2);
    numbers[0] = tick;
    let offset = 1;

    for (const body of bodies) {
        const pose = poses.poseOf(body.entity.id);
        if (pose === undefined) continue;

        const velocity = scene.world.velocityOf(body.handle);
        const { linear, spin } = velocity;
        const bodyNumbers = [body.entity.id, pose.x, pose.y, pose.angle, linear.x, linear.y, spin];
        numbers.set(bodyNumbers, offset);
        offset += NUMBERS_PER_BODY;
    }

    numbers[offset] = camera.x;
    numbers[offset + 1] = camera.y;

    // The bytes are in the computer's own order, which is little-endian in every browser and CI runner.
    const bytes = new Uint8Array(numbers.buffer);

    return fnv1a(bytes);
}

function fnv1a(bytes: Uint8Array) {
    let hash = FNV_OFFSET_BASIS;

    for (const byte of bytes) {
        hash ^= byte;
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    return hash.toString(16).padStart(8, '0');
}

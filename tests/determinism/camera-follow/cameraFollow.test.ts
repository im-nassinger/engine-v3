import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import { CameraComponent } from '../../../src/core/components/index.ts';
import type { Point } from '../../../src/core/geometry/index.ts';
import { startSimulation } from '../../../src/core/simulation/index.ts';
import type { Simulation } from '../../../src/core/simulation/index.ts';
import { CAMERA_FOLLOW_BOUNDS } from '../../levels/determinism/build/determinismLevels.ts';

import { readLevelFile } from '../level-files/determinismFiles.ts';
import { DETERMINISM_START, DETERMINISM_TICKS } from '../run/determinismRun.ts';

const ORIGIN = { x: 0, y: 0 };

type CameraTick = {
    readonly camera: Point;
    readonly target: Point;
};

const engine = new Box2dPhysicsEngine();
const levelData = await readLevelFile('camera-follow');
let ticks: readonly CameraTick[] = [];
let halfBox = { width: 0, height: 0 };

beforeAll(async () => {
    await engine.load();
    const started = startSimulation(levelData, engine, DETERMINISM_START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    const camera = started.value.level.camera.requireComponent(CameraComponent);
    halfBox = { width: camera.get('width') / 2, height: camera.get('height') / 2 };
    ticks = recordTicks(started.value);
});

// The camera and its target's level origin after every tick, then the run ended.
function recordTicks(simulation: Simulation) {
    const recorded: CameraTick[] = [];

    try {
        for (let tick = 1; tick <= DETERMINISM_TICKS; tick += 1) {
            simulation.runTick({ heldKeys: [], pressedKeys: [] });
            recorded.push({ camera: simulation.takeReport().camera, target: targetOrigin(simulation) });
        }
    } finally {
        simulation.destroy();
    }

    return recorded;
}

function targetOrigin(simulation: Simulation) {
    const followId = simulation.level.camera.requireComponent(CameraComponent).get('follow');
    const target = followId === null ? undefined : simulation.level.findEntity(followId);
    if (target === undefined) throw new Error('The ball is gone from the run.');

    return simulation.caches.worldMatrices.matrixOf(target).apply(ORIGIN);
}

describe('camera-follow', () => {
    test('the followed ball stays inside the camera box on every tick', () => {
        expect(ticks).toHaveLength(DETERMINISM_TICKS);

        for (const { camera, target } of ticks) {
            expect(Math.abs(target.x - camera.x)).toBeLessThanOrEqual(halfBox.width);
            expect(Math.abs(target.y - camera.y)).toBeLessThanOrEqual(halfBox.height);
        }
    });

    test('the camera box never leaves the level bounds', () => {
        const right = CAMERA_FOLLOW_BOUNDS.width / 2;
        const bottom = CAMERA_FOLLOW_BOUNDS.height / 2;

        for (const { camera } of ticks) {
            expect(Math.abs(camera.x) + halfBox.width).toBeLessThanOrEqual(right);
            expect(Math.abs(camera.y) + halfBox.height).toBeLessThanOrEqual(bottom);
        }
    });

    test('the camera moves and stops at the bounds on both sides it reaches', () => {
        const xs = ticks.map((tick) => tick.camera.x);
        const ys = ticks.map((tick) => tick.camera.y);
        const sideRoom = CAMERA_FOLLOW_BOUNDS.width / 2 - halfBox.width;

        expect(Math.min(...xs)).toBe(-sideRoom);
        expect(Math.max(...xs)).toBe(sideRoom);
        expect(Math.max(...ys)).toBeGreaterThan(Math.min(...ys));
    });
});

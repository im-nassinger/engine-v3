import { expect, test } from 'vitest';

import { BodyPoses } from '../../core/physics/index.ts';

import { Box2dPhysicsEngine } from './Box2dPhysicsEngine.ts';

test('Box2D loads in the browser and a Dynamic body falls', async () => {
    const engine = new Box2dPhysicsEngine();
    await engine.load();

    const world = engine.createWorld({ gravity: { x: 0, y: 9.8 }, pixelsPerMetre: 50 });
    const poses = new BodyPoses();
    world.createBody({
        entity: 3,
        type: 'dynamic',
        position: { x: 0, y: 0 },
        angle: 0,
        gravityScale: 1,
        linearDamping: 0,
        angularDamping: 0,
        fixedRotation: false,
        bullet: false,
    });

    for (let i = 0; i < 60; i++) {
        world.step();
        world.readMovedBodies(poses);
    }

    expect(poses.poseOf(3)?.y).toBeGreaterThan(240);
    world.destroy();
});

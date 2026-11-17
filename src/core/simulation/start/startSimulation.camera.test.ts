import { describe, expect, test } from 'vitest';

import { CameraComponent, PhysicsWorldComponent, ShapeComponent, TransformComponent } from '../../components/index.ts';
import type { EntityId } from '../../fields/index.ts';
import type { Point } from '../../geometry/index.ts';
import { LevelWriter } from '../../level-data/index.ts';
import { Level } from '../../level/index.ts';

import type { Simulation } from '../run/Simulation.ts';
import { ScriptedEngine } from '../testing/ScriptedPhysics.ts';
import { place, placeBody, runTicks, transform } from '../testing/scriptedLevel.ts';

import { startSimulation } from './startSimulation.ts';

const START = { clockTimeMs: 0 };
const ORIGIN = { x: 0, y: 0 };

// The level written and read back, as the game worker will get it, run on a ScriptedWorld.
function startScripted(level: Level) {
    const engine = new ScriptedEngine();
    const levelData = new LevelWriter().write(level);
    const started = startSimulation(levelData, engine, START);
    if (!started.ok) throw new Error(`The level was refused: ${JSON.stringify(started.refusal)}`);

    return { simulation: started.value, world: engine.world };
}

function follow(level: Level, target: EntityId | null, smoothingSeconds: number) {
    const camera = level.camera.requireComponent(CameraComponent);
    camera.set('follow', target);
    camera.set('smoothing', smoothingSeconds);
}

// A camera with no target, placed at a level position.
function placeCamera(level: Level, position: Point) {
    level.camera.requireComponent(CameraComponent).set('follow', null);
    level.camera.requireComponent(TransformComponent).set('position', position);
}

function levelOriginOf(simulation: Simulation, id: EntityId) {
    const entity = simulation.level.findEntity(id);
    if (entity === undefined) throw new Error(`Entity ${id} is gone.`);

    const matrix = simulation.caches.worldMatrices.matrixOf(entity);

    return matrix.apply(ORIGIN);
}

describe('CameraPhase', () => {
    test('the run starts with the camera on its target, with no opening pan', () => {
        const level = Level.createNew();
        const player = placeBody(level, level.world, transform(3000, -1500), 'static');
        follow(level, player.id, 0.3);
        const { simulation } = startScripted(level);

        expect(simulation.takeReport().camera).toEqual({ x: 3000, y: -1500 });

        runTicks(simulation, 5);

        expect(simulation.takeReport().camera).toEqual({ x: 3000, y: -1500 });
    });

    test('the starting camera is limited to the bounds, also with no target', () => {
        const level = Level.createNew();
        const corner = placeBody(level, level.world, transform(9990, 4990), 'static');
        follow(level, corner.id, 0.3);
        const { simulation } = startScripted(level);

        expect(simulation.takeReport().camera).toEqual({ x: 10_000 - 960, y: 5000 - 540 });

        const unfollowed = Level.createNew();
        placeCamera(unfollowed, { x: 9900, y: -4900 });
        const { simulation: still } = startScripted(unfollowed);

        expect(still.takeReport().camera).toEqual({ x: 10_000 - 960, y: -5000 + 540 });
    });

    test('a target inside a rotated group is followed by its level origin', () => {
        const level = Level.createNew();
        const group = place(level, level.world, transform(500, 0, 90));
        const crate = placeBody(level, group, transform(100, 0));
        follow(level, crate.id, 0);
        const { simulation } = startScripted(level);

        expect(simulation.takeReport().camera).toEqual(levelOriginOf(simulation, crate.id));

        runTicks(simulation, 3);
        const camera = simulation.takeReport().camera;

        expect(camera).toEqual(levelOriginOf(simulation, crate.id));
        expect(camera.x).toBeCloseTo(500, 9);
        expect(camera.y).toBeCloseTo(130, 9);
    });

    test('the camera eases towards a moving target, kept inside the safety margin', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        follow(level, crate.id, 0.3);
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(crate.id, { x: 100, y: 0, angle: 0 });
        runTicks(simulation, 1);
        const eased = simulation.takeReport().camera;

        expect(eased.x).toBeGreaterThan(0);
        expect(eased.x).toBeLessThan(100);

        world.setNextPose(crate.id, { x: 5000, y: 0, angle: 0 });
        runTicks(simulation, 1);
        const cut = simulation.takeReport().camera;

        expect(cut.x).toBeCloseTo(5000 - 960 + 192, 9);
    });

    test('a hidden target is followed', () => {
        const level = Level.createNew();
        const crate = placeBody(level, level.world, transform(0, 0));
        crate.setHidden(true);
        follow(level, crate.id, 0);
        const { simulation } = startScripted(level);

        runTicks(simulation, 4);

        expect(simulation.takeReport().camera).toEqual(levelOriginOf(simulation, crate.id));
    });

    test('a removed target leaves the camera still where it was', () => {
        // 4,000 px wide and 1,000 px tall: shorter than the camera, so only its x moves.
        const level = Level.createNew();
        level.world.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 4000, height: 1000 });
        level.world.requireComponent(PhysicsWorldComponent).set('walls', false);
        const crate = placeBody(level, level.world, transform(0, 490));
        follow(level, crate.id, 1);
        const { simulation, world } = startScripted(level);
        world.falling = false;

        world.setNextPose(crate.id, { x: 100, y: 490, angle: 0 });
        runTicks(simulation, 1);
        world.setNextPose(crate.id, { x: 200, y: 520, angle: 0 });
        runTicks(simulation, 1);
        const report = simulation.takeReport();

        expect(report.removed).toEqual([crate.id]);
        expect(report.camera.x).toBeGreaterThan(0);
        expect(report.camera.x).toBeLessThan(200);
        expect(report.camera.y).toBe(0);

        runTicks(simulation, 5);

        expect(simulation.takeReport().camera).toEqual(report.camera);
    });

    test('with no target the camera stays where it was placed', () => {
        const level = Level.createNew();
        placeCamera(level, { x: -700, y: 250 });
        placeBody(level, level.world, transform(0, 0));
        const { simulation } = startScripted(level);

        runTicks(simulation, 10);

        expect(simulation.takeReport().camera).toEqual({ x: -700, y: 250 });
    });

    test("stateHash reads the run's camera", () => {
        const placedOutside = Level.createNew();
        const placedAtEdge = Level.createNew();
        const placedElsewhere = Level.createNew();
        placeCamera(placedOutside, { x: 20_000, y: 0 });
        placeCamera(placedAtEdge, { x: 10_000 - 960, y: 0 });
        placeCamera(placedElsewhere, { x: 0, y: 0 });

        const outsideHash = startScripted(placedOutside).simulation.stateHash();
        const edgeHash = startScripted(placedAtEdge).simulation.stateHash();
        const elsewhereHash = startScripted(placedElsewhere).simulation.stateHash();

        expect(outsideHash).toBe(edgeHash);
        expect(elsewhereHash).not.toBe(edgeHash);
    });
});

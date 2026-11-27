import {
    CameraComponent,
    PhysicsWorldComponent,
    StyleComponent,
    TransformComponent,
} from '../../../../src/core/components/index.ts';
import { Level } from '../../../../src/core/level/index.ts';
import type { Entity } from '../../../../src/core/level/index.ts';
import { addEntity, addShape, at, circle, setBounds } from '../../determinism/build/levelParts.ts';
import { giveTriggers } from '../../determinism/build/triggerParts.ts';

import { addArtGroup } from '../platformer/art/artEntities.ts';
import { pinkAntennae, yellowChick } from '../platformer/art/decorations.ts';
import { addBlob, setBlobInputs } from '../platformer/buildPlatformer.ts';
import { PLAYER_TAG } from '../platformer/controller/blobController.ts';
import { GRAVITY, PIXELS_PER_METRE } from '../platformer/controller/platformerFeel.ts';
import { otherHasTag, win } from '../platformer/controller/triggerBlocks.ts';
import { homeParts } from './art/home.ts';
import { SKY } from './art/palette.ts';
import { addScenery, addTufts } from './art/scenery.ts';
import { addCourse, addHazards } from './course/addCourse.ts';
import { HOME, LEVEL_BOTTOM, LEVEL_LEFT, LEVEL_RIGHT, LEVEL_TOP, START } from './course/layout.ts';
import { addMonster } from './monster/addMonster.ts';

// The chase: the Blob wakes in a forest at dusk with the Gloom right behind it, and runs for home.
export const CHASE_NAME = 'Blob chase';

// The sky over the whole level, top to bottom, with each colour's height in level pixels.
const SKY_STOPS: [string, number][] = [
    [SKY.night, -1200],
    [SKY.high, -750],
    [SKY.dusk, -330],
    [SKY.rose, 0],
    [SKY.glow, 260],
    [SKY.horizon, 480],
];

function skyFill() {
    const height = LEVEL_BOTTOM - LEVEL_TOP;
    const stops = SKY_STOPS.map(([colour, y]) => ({ colour, place: (y - LEVEL_TOP) / height }));

    return { kind: 'linear', stops, start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;
}

// The hut, its doorway the goal, with two friends waiting outside.
function addHome(level: Level) {
    const home = addArtGroup(level, level.world, 'Home', HOME, homeParts());
    const door = addEntity(level, home, 'Doorway', at(0, -60));
    addShape(door, circle(50));
    giveTriggers(door, [{ when: { kind: 'touched' }, checks: [otherHasTag(PLAYER_TAG)], actions: [win()] }]);
    addArtGroup(level, home, 'Pink friend', { x: 230, y: 0 }, pinkAntennae());
    addArtGroup(level, home, 'Chick', { x: 310, y: 0 }, yellowChick());
}

function setUpWorld(level: Level, blob: Entity) {
    setBounds(level, LEVEL_RIGHT - LEVEL_LEFT, LEVEL_BOTTOM - LEVEL_TOP, true);
    const physics = level.world.requireComponent(PhysicsWorldComponent);
    physics.set('gravity', { x: 0, y: GRAVITY });
    physics.set('pixelsPerMetre', PIXELS_PER_METRE);
    level.world.requireComponent(StyleComponent).set('fill', skyFill());
    setBlobInputs(level);

    const camera = level.camera.requireComponent(CameraComponent);
    camera.set('follow', blob.id);
    camera.set('width', 1600);
    camera.set('height', 900);
    camera.set('smoothing', 0.2);
    level.camera.requireComponent(TransformComponent).set('position', { x: START.x - 150, y: START.y - 160 });
}

// Built front to back: an entity higher in the Entities viewer is drawn in front.
export function buildChase() {
    const level = Level.createNew();
    level.rename(CHASE_NAME);

    const blob = addBlob(level, START);
    const monster = addMonster(level);
    addHome(level);
    addTufts(level);
    addHazards(level);
    addCourse(level);
    addScenery(level);
    setUpWorld(level, blob);

    return { level, blob, monster };
}

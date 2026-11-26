import {
    CameraComponent,
    InputComponent,
    PhysicsWorldComponent,
    StyleComponent,
    TagsComponent,
    TransformComponent,
} from '../../../../src/core/components/index.ts';
import type { Point } from '../../../../src/core/geometry/index.ts';
import { KeyCodes } from '../../../../src/core/keys/index.ts';
import { Level } from '../../../../src/core/level/index.ts';
import type { Entity } from '../../../../src/core/level/index.ts';
import {
    addBody,
    addEntity,
    addShape,
    addSurface,
    at,
    circle,
    polygon,
    rectangle,
    setBounds,
} from '../../determinism/build/levelParts.ts';
import { giveOwnVariables, giveTriggers } from '../../determinism/build/triggerParts.ts';

import { addArtGroup, addArtPath } from './art/artEntities.ts';
import { ANIMATIONS, FRAME_TAG, LEFT_POSE_OFFSET, poseTag, rightFrames } from './art/blobAnimations.ts';
import { blobFrameParts } from './art/blobArt.ts';
import type { ArtPart } from './art/blobArt.ts';
import { BLOB_VARIABLES, blobTriggers, feetTriggers, PLAYER_TAG } from './controller/blobController.ts';
import { addCourse, GOAL, START } from './course.ts';
import {
    cloud,
    flower,
    greenSprout,
    hill,
    orangeTwin,
    pinkAntennae,
    purpleBlock,
    yellowChick,
} from './art/decorations.ts';
import { mirroredPath } from './art/pathShapes.ts';
import { BLOB_CORNER_CUT, BLOB_HEIGHT, BLOB_WIDTH, GRAVITY, PIXELS_PER_METRE } from './controller/platformerFeel.ts';
import { otherHasTag, win } from './controller/triggerBlocks.ts';

export const PLATFORMER_NAME = 'Blob platformer';
const LEVEL_WIDTH = 9000;
const LEVEL_HEIGHT = 2400;
const BACKGROUND = '#FFF6EAFF';
const FEET_WIDTH = 40;
const FEET_HEIGHT = 10;

// An octagon: the cut corners slide the blob past an edge it clips by a few pixels.
function blobOutline() {
    const halfWidth = BLOB_WIDTH / 2;
    const halfHeight = BLOB_HEIGHT / 2;
    const cut = BLOB_CORNER_CUT;

    return polygon([
        { x: -halfWidth + cut, y: -halfHeight },
        { x: halfWidth - cut, y: -halfHeight },
        { x: halfWidth, y: -halfHeight + cut },
        { x: halfWidth, y: halfHeight - cut },
        { x: halfWidth - cut, y: halfHeight },
        { x: -halfWidth + cut, y: halfHeight },
        { x: -halfWidth, y: halfHeight - cut },
        { x: -halfWidth, y: -halfHeight + cut },
    ]);
}

function addFrame(level: Level, art: Entity, pose: number, name: string, mirrored: boolean, frameIndex: number) {
    const frames = rightFrames();
    const spec = frames[frameIndex];
    if (spec === undefined) throw new Error(`No frame ${frameIndex}.`);

    const group = addEntity(level, art, name);
    const opacity = pose === 0 ? 1 : 0;
    const tags = [FRAME_TAG, poseTag(pose)];
    for (const artPart of blobFrameParts(spec)) {
        let path = artPart.path;
        if (mirrored) {
            path = mirroredPath(path);
        }
        addArtPath(level, group, { ...artPart, path }, opacity, tags);
    }
}

// "Idle 1", "Idle 2" and so on, in pose order.
function frameNames() {
    const names: string[] = [];
    for (const [animationName, animation] of Object.entries(ANIMATIONS)) {
        const title = animationName.charAt(0).toUpperCase() + animationName.slice(1);
        for (let frame = 1; frame <= animation.frames.length; frame++) {
            names.push(`${title} ${frame}`);
        }
    }

    return names;
}

function addBlob(level: Level) {
    const startY = START.y - BLOB_HEIGHT / 2 - 1;
    const blob = addEntity(level, level.world, 'Blob', at(START.x, startY));
    addSurface(blob, blobOutline(), { friction: 0, restitution: 0, density: 1 });
    addBody(blob, { type: 'dynamic', fixedRotation: true });
    blob.addComponent(new TagsComponent({ tags: [PLAYER_TAG] }));
    giveOwnVariables(blob, BLOB_VARIABLES);
    giveTriggers(blob, blobTriggers());

    const feet = addEntity(level, blob, 'Feet', at(0, BLOB_HEIGHT / 2));
    addShape(feet, rectangle(FEET_WIDTH, FEET_HEIGHT));
    giveTriggers(feet, feetTriggers(blob));

    const art = addEntity(level, blob, 'Art');
    const names = frameNames();
    for (let frame = 0; frame < LEFT_POSE_OFFSET; frame++) {
        addFrame(level, art, frame, `${names[frame]} right`, false, frame);
    }
    for (let frame = 0; frame < LEFT_POSE_OFFSET; frame++) {
        addFrame(level, art, frame + LEFT_POSE_OFFSET, `${names[frame]} left`, true, frame);
    }

    return blob;
}

function addGoal(level: Level) {
    const goal = addArtGroup(level, level.world, 'Goal', GOAL, flower());
    const sensor = addEntity(level, goal, 'Goal sensor', at(0, -70));
    addShape(sensor, circle(60));
    giveTriggers(sensor, [{ when: { kind: 'touched' }, checks: [otherHasTag(PLAYER_TAG)], actions: [win()] }]);
}

// A friend standing by. They don't bob: changing a drawn entity's position in play draws it in front of
// the blob (docs/bugs.md).
function addFriend(level: Level, parent: Entity, name: string, position: Point, parts: readonly ArtPart[]) {
    addArtGroup(level, parent, name, position, parts);
}

function addFriends(level: Level) {
    const friends = addEntity(level, level.world, 'Friends');
    addFriend(level, friends, 'Pink friend', { x: -3950, y: 400 }, pinkAntennae());
    addFriend(level, friends, 'Chick', { x: -3500, y: 400 }, yellowChick());
    addFriend(level, friends, 'Twins', { x: -1950, y: 280 }, orangeTwin());
    addFriend(level, friends, 'Tall friend', { x: 200, y: 1000 }, purpleBlock());
    addFriend(level, friends, 'Sprout', { x: 950, y: 240 }, greenSprout());
    addFriend(level, friends, 'Chick 2', { x: 3350, y: 240 }, yellowChick());
    addFriend(level, friends, 'Pink friend 2', { x: 4380, y: 240 }, pinkAntennae());
}

function addScenery(level: Level) {
    const scenery = addEntity(level, level.world, 'Scenery');
    const clouds: Point[] = [
        { x: -4000, y: -300 },
        { x: -2800, y: -600 },
        { x: -1200, y: -700 },
        { x: 300, y: -450 },
        { x: 1700, y: -650 },
        { x: 3000, y: -500 },
        { x: 4100, y: -750 },
    ];
    clouds.forEach((place, index) => {
        const width = 220 + (index % 3) * 60;
        addArtGroup(level, scenery, `Cloud ${index + 1}`, place, cloud(width));
    });

    const hills: [number, number, number, number, string][] = [
        [-4100, 400, 900, 380, '#FFE4D1FF'],
        [-2600, 300, 1100, 520, '#F3E3FFFF'],
        [-600, 1000, 1400, 700, '#FFE4D1FF'],
        [1400, 240, 1300, 460, '#E0F5E6FF'],
        [3300, 240, 1500, 560, '#F3E3FFFF'],
    ];
    hills.forEach(([x, y, width, height, colour], index) => {
        addArtGroup(level, scenery, `Hill ${index + 1}`, { x, y }, hill(width, height, colour));
    });
}

function keyCodes(codes: readonly string[]) {
    return codes.filter((code) => KeyCodes.isBindable(code));
}

function setUpWorld(level: Level, blob: Entity) {
    setBounds(level, LEVEL_WIDTH, LEVEL_HEIGHT, true);
    const physics = level.world.requireComponent(PhysicsWorldComponent);
    physics.set('gravity', { x: 0, y: GRAVITY });
    physics.set('pixelsPerMetre', PIXELS_PER_METRE);

    const background = level.world.requireComponent(StyleComponent);
    background.set('fill', { kind: 'solid', colour: BACKGROUND });

    level.world.requireComponent(InputComponent).set('inputs', [
        { name: 'left', keys: keyCodes(['KeyA', 'ArrowLeft']) },
        { name: 'right', keys: keyCodes(['KeyD', 'ArrowRight']) },
        { name: 'up', keys: [] },
        { name: 'down', keys: keyCodes(['KeyS', 'ArrowDown']) },
        { name: 'jump', keys: keyCodes(['Space', 'KeyW', 'ArrowUp']) },
    ]);

    const camera = level.camera.requireComponent(CameraComponent);
    camera.set('follow', blob.id);
    camera.set('width', 1600);
    camera.set('height', 900);
    camera.set('smoothing', 0.2);
    level.camera.requireComponent(TransformComponent).set('position', { x: START.x, y: START.y - 200 });
}

export function buildPlatformer() {
    const level = Level.createNew();
    level.rename(PLATFORMER_NAME);

    const blob = addBlob(level);
    addGoal(level);
    addFriends(level);
    addCourse(level);
    addScenery(level);
    setUpWorld(level, blob);

    return { level, blob };
}

import { CameraComponent, PhysicsWorldComponent } from '../../../../src/core/components/index.ts';
import type { Point } from '../../../../src/core/geometry/index.ts';
import { Level } from '../../../../src/core/level/index.ts';

import {
    addBody,
    addEntity,
    addJoint,
    addSurface,
    at,
    circle,
    line,
    polygon,
    rectangle,
    setBounds,
    setGravity,
} from './levelParts.ts';
import { triggerCoins, triggerTimers, triggerTouchGroups } from './triggerLevels.ts';
import { triggerDoors, triggerHits } from './triggerLevelsV4.ts';

export type DeterminismLevel = {
    // The file name, without .json, of the level and of its recorded hashes.
    readonly name: string;
    readonly build: () => Level;
};

const CRATE = 40;
const PYRAMID_ROWS = 5;

// Fifteen crates stacked five rows high on a Static floor: many touching bodies settling together.
function cratePyramid() {
    const level = Level.createNew();
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(600, 20));

    for (let row = 0; row < PYRAMID_ROWS; row += 1) {
        const crates = PYRAMID_ROWS - row;
        const y = 290 - CRATE / 2 - row * CRATE;

        for (let column = 0; column < crates; column += 1) {
            const x = (column - (crates - 1) / 2) * (CRATE + 1);
            const crate = addEntity(level, level.world, `Crate ${row + 1}.${column + 1}`, at(x, y));
            addBody(addSurface(crate, rectangle(CRATE, CRATE)));
        }
    }

    return level;
}

// A car body of three merged shapes, a chassis, a cabin and a round bumper, sliding down a slope.
function mergedCar() {
    const level = Level.createNew();
    addSurface(
        addEntity(level, level.world, 'Slope', { position: { x: 0, y: 300 }, rotation: 12 }),
        rectangle(1200, 20),
    );
    const car = addBody(addEntity(level, level.world, 'Car', at(-300, 0)));
    addSurface(addEntity(level, car, 'Chassis'), rectangle(160, 30), { friction: 0.3 });
    addSurface(addEntity(level, car, 'Cabin', at(-10, -30)), rectangle(80, 30), { density: 0.5 });
    addSurface(addEntity(level, car, 'Bumper', at(80, 0)), circle(15), { restitution: 0.4 });

    return level;
}

// A self-crossing polygon, a bow tie the polygon pipeline splits into pieces, falling on a Static line.
function selfCrossingPolygon() {
    const level = Level.createNew();
    const ground = [
        { x: -400, y: 200 },
        { x: -100, y: 300 },
        { x: 150, y: 260 },
        { x: 400, y: 320 },
    ];
    addSurface(addEntity(level, level.world, 'Ground'), line(ground));
    const bowTie = [
        { x: -50, y: -40 },
        { x: 50, y: 40 },
        { x: 50, y: -40 },
        { x: -50, y: 40 },
    ];
    const falling = addEntity(level, level.world, 'Bow tie', { position: { x: -60, y: 0 }, rotation: 20 });
    addBody(addSurface(falling, polygon(bowTie)));

    return level;
}

// Small open bounds: crates slide off a ramp and leave through the bottom edge, and one that starts above
// the top edge stays until it has fallen inside and out again.
function leavingOpenEdge() {
    const level = Level.createNew();
    setBounds(level, 800, 600, false);
    addSurface(
        addEntity(level, level.world, 'Ramp', { position: { x: 0, y: 100 }, rotation: -20 }),
        rectangle(500, 20),
    );

    for (let index = 0; index < 4; index += 1) {
        const crate = addEntity(level, level.world, `Crate ${index + 1}`, at(-150 + index * 70, -100));
        addBody(addSurface(crate, rectangle(30, 30)));
    }
    addBody(addSurface(addEntity(level, level.world, 'Late crate', at(300, -400)), rectangle(30, 30)));

    return level;
}

// Balls of different bounce inside Walls, hitting the walls, the floor and each other.
function bouncingBalls() {
    const level = Level.createNew();
    setBounds(level, 600, 400, true);
    setGravity(level, { x: 3, y: 9.8 });

    for (let index = 0; index < 6; index += 1) {
        const ball = addEntity(level, level.world, `Ball ${index + 1}`, at(-240 + index * 90, -150 + (index % 2) * 60));
        const restitution = 0.5 + index * 0.1;
        addBody(addSurface(ball, circle(15 + index * 3), { restitution, friction: 0.1 }));
    }

    return level;
}

// One body of each type, and Dynamic bodies with gravity scale, damping, fixed rotation and bullet set.
function bodySettings() {
    const level = Level.createNew();
    addSurface(
        addEntity(level, level.world, 'Floor', { position: { x: 0, y: 300 }, rotation: 5 }),
        rectangle(1000, 20),
    );
    addBody(addSurface(addEntity(level, level.world, 'Static post', at(-300, 200)), rectangle(20, 180)), {
        type: 'static',
    });
    addBody(addSurface(addEntity(level, level.world, 'Kinematic block', at(-150, 100)), rectangle(80, 20)), {
        type: 'kinematic',
    });
    const rising = addEntity(level, level.world, 'Rising', at(-50, 0));
    addBody(addSurface(rising, rectangle(30, 30)), { gravityScale: -0.5 });
    const damped = addEntity(level, level.world, 'Damped', { position: { x: 50, y: -100 }, rotation: 30 });
    addBody(addSurface(damped, rectangle(30, 30)), { linearDamping: 2, angularDamping: 5 });
    const upright = addEntity(level, level.world, 'Upright', { position: { x: 150, y: 0 }, rotation: 45 });
    addBody(addSurface(upright, rectangle(30, 60)), { fixedRotation: true });
    const bullet = addEntity(level, level.world, 'Bullet', at(250, -300));
    addBody(addSurface(bullet, circle(5), { density: 5 }), { bullet: true, gravityScale: 4 });

    return level;
}

// A group rotated, skewed and mirrored, its body merging a box, an unevenly scaled circle and a triangle.
function transformedGroup() {
    const level = Level.createNew();
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(800, 20));
    const transform = { position: { x: 0, y: 0 }, rotation: 30, scale: { x: -1.5, y: 1 }, skew: 15 };
    const group = addBody(addEntity(level, level.world, 'Twisted group', transform));
    addSurface(addEntity(level, group, 'Box', at(-40, 0)), rectangle(50, 30));
    addSurface(addEntity(level, group, 'Wheel', at(30, 10)), circle(20));
    const triangle = [
        { x: 0, y: -30 },
        { x: 25, y: 15 },
        { x: -25, y: 15 },
    ];
    addSurface(addEntity(level, group, 'Fin', { position: { x: 0, y: -40 }, rotation: 10 }), polygon(triangle));

    return level;
}

const PLANKS = 8;
const PLANK = 50;
const PLANK_GAP = 10;

// Eight planks hung by Ropes between two Static posts, sagging, with a crate dropped on the middle.
function ropeBridge() {
    const level = Level.createNew();
    const span = PLANKS * PLANK + (PLANKS + 1) * PLANK_GAP;
    const left = -span / 2;
    const leftPost = addSurface(addEntity(level, level.world, 'Left post', at(left - 10, 50)), rectangle(20, 100));
    const rightPost = addSurface(addEntity(level, level.world, 'Right post', at(-left + 10, 50)), rectangle(20, 100));
    const planks = [];

    for (let index = 0; index < PLANKS; index += 1) {
        const x = left + PLANK_GAP + PLANK / 2 + index * (PLANK + PLANK_GAP);
        planks.push(
            addBody(addSurface(addEntity(level, level.world, `Plank ${index + 1}`, at(x, 5)), rectangle(PLANK, 10))),
        );
    }
    const ends = [leftPost, ...planks, rightPost];

    for (let index = 0; index + 1 < ends.length; index += 1) {
        const x = left + index * (PLANK + PLANK_GAP);
        const a = ends[index + 1]?.id ?? null;
        const b = ends[index]?.id ?? null;
        // A slack Rope from the right edge of one to the left edge of the next, A on the right.
        addJoint(
            level,
            `Rope ${index + 1}`,
            { type: 'rope', a, b, matchDrawnDistance: false, length: PLANK_GAP * 1.5 },
            {
                x: x + PLANK_GAP,
                y: 0,
            },
            { x, y: 0 },
        );
    }
    addBody(addSurface(addEntity(level, level.world, 'Crate', at(15, -150)), rectangle(40, 40), { density: 2 }));

    return level;
}

const STIFFNESSES = [1, 4, 10];

// Three weights hung from a Static ceiling by Springs of three stiffnesses, each pulled down past its rest length.
function springs() {
    const level = Level.createNew();
    const ceiling = addSurface(addEntity(level, level.world, 'Ceiling', at(0, -200)), rectangle(600, 20));

    STIFFNESSES.forEach((stiffness, index) => {
        const x = -150 + index * 150;
        const weight = addEntity(level, level.world, `Weight ${index + 1}`, at(x, 50));
        addBody(addSurface(weight, rectangle(40, 40)));
        const joint = { type: 'spring' as const, a: weight.id, b: ceiling.id, stiffness, damping: 0.1 + index * 0.2 };
        addJoint(
            level,
            `Spring ${index + 1}`,
            { ...joint, matchDrawnDistance: false, restLength: 150 },
            point(x, 30),
            point(x, -190),
        );
    });

    return level;
}

const WHEEL = 20;

// A car of one body whose back wheel is driven clockwise by a Hinge's motor and whose front wheel turns freely.
function hingedCar() {
    const level = Level.createNew();
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    addSurface(
        addEntity(level, level.world, 'Bump', { position: { x: 100, y: 290 }, rotation: 45 }),
        rectangle(30, 30),
    );
    const car = addEntity(level, level.world, 'Car', at(-300, 230));
    addBody(addSurface(car, rectangle(140, 30)));
    const back = addBody(
        addSurface(addEntity(level, level.world, 'Back wheel', at(-350, 260)), circle(WHEEL), { friction: 0.9 }),
    );
    const front = addBody(
        addSurface(addEntity(level, level.world, 'Front wheel', at(-250, 260)), circle(WHEEL), { friction: 0.9 }),
    );
    addJoint(
        level,
        'Back hinge',
        { type: 'hinge', a: back.id, b: car.id, motor: true, motorSpeed: 180, motorStrength: 200 },
        point(-350, 260),
    );
    addJoint(level, 'Front hinge', { type: 'hinge', a: front.id, b: car.id }, point(-250, 260));

    return level;
}

// Only a little wider and taller than the default 1920 by 1080 camera, so the camera stops at the bounds
// both ways.
export const CAMERA_FOLLOW_BOUNDS = { width: 2400, height: 1400 };

// A ball rolling down two slopes towards the right Wall, followed by the camera with the default 0.3 s of
// smoothing.
function cameraFollow() {
    const level = Level.createNew();
    setBounds(level, CAMERA_FOLLOW_BOUNDS.width, CAMERA_FOLLOW_BOUNDS.height, true);
    addSurface(
        addEntity(level, level.world, 'Upper slope', { position: { x: -500, y: -250 }, rotation: 10 }),
        rectangle(1300, 20),
    );
    addSurface(
        addEntity(level, level.world, 'Lower slope', { position: { x: 500, y: 250 }, rotation: 8 }),
        rectangle(1300, 20),
    );
    const ball = addEntity(level, level.world, 'Ball', at(-1000, -450));
    addBody(addSurface(ball, circle(30), { friction: 0.6 }));
    level.camera.requireComponent(CameraComponent).set('follow', ball.id);

    return level;
}

function point(x: number, y: number): Point {
    return { x, y };
}

// Every determinism level was built and recorded at the old fixed 50 px per metre. They keep that scale, so
// making it the World's setting changed none of their hashes (v4 task 33, standing yes, 2026-11-25).
function atFiftyPixelsPerMetre(build: () => Level) {
    return () => {
        const level = build();
        level.world.requireComponent(PhysicsWorldComponent).set('pixelsPerMetre', 50);

        return level;
    };
}

// The determinism test's levels: stage 13's seven, stage 14's three with joints, stage 15's camera and v3's
// three and v4's two with triggers, which read the recorded inputs in tests/levels/determinism/inputs/.
export const DETERMINISM_LEVELS: readonly DeterminismLevel[] = [
    { name: 'crate-pyramid', build: atFiftyPixelsPerMetre(cratePyramid) },
    { name: 'merged-car', build: atFiftyPixelsPerMetre(mergedCar) },
    { name: 'self-crossing-polygon', build: atFiftyPixelsPerMetre(selfCrossingPolygon) },
    { name: 'leaving-open-edge', build: atFiftyPixelsPerMetre(leavingOpenEdge) },
    { name: 'bouncing-balls', build: atFiftyPixelsPerMetre(bouncingBalls) },
    { name: 'body-settings', build: atFiftyPixelsPerMetre(bodySettings) },
    { name: 'transformed-group', build: atFiftyPixelsPerMetre(transformedGroup) },
    { name: 'rope-bridge', build: atFiftyPixelsPerMetre(ropeBridge) },
    { name: 'springs', build: atFiftyPixelsPerMetre(springs) },
    { name: 'hinged-car', build: atFiftyPixelsPerMetre(hingedCar) },
    { name: 'camera-follow', build: atFiftyPixelsPerMetre(cameraFollow) },
    { name: 'trigger-coins', build: atFiftyPixelsPerMetre(triggerCoins) },
    { name: 'trigger-timers', build: atFiftyPixelsPerMetre(triggerTimers) },
    { name: 'trigger-touch-groups', build: atFiftyPixelsPerMetre(triggerTouchGroups) },
    { name: 'trigger-doors', build: atFiftyPixelsPerMetre(triggerDoors) },
    { name: 'trigger-hits', build: atFiftyPixelsPerMetre(triggerHits) },
];

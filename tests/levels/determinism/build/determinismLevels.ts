import { Level } from '../../../../src/core/level/index.ts';

import {
    addBody,
    addEntity,
    addSurface,
    at,
    circle,
    line,
    polygon,
    rectangle,
    setBounds,
    setGravity,
} from './levelParts.ts';

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

// The determinism test's levels in stage 13. Stage 14 adds joints and stage 15 the camera.
export const DETERMINISM_LEVELS: readonly DeterminismLevel[] = [
    { name: 'crate-pyramid', build: cratePyramid },
    { name: 'merged-car', build: mergedCar },
    { name: 'self-crossing-polygon', build: selfCrossingPolygon },
    { name: 'leaving-open-edge', build: leavingOpenEdge },
    { name: 'bouncing-balls', build: bouncingBalls },
    { name: 'body-settings', build: bodySettings },
    { name: 'transformed-group', build: transformedGroup },
];

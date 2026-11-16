import { beforeAll, describe, expect, test } from 'vitest';

import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';
import type { JointValues } from '../../../src/core/components/index.ts';
import { LevelWriter } from '../../../src/core/level-data/index.ts';
import { Level } from '../../../src/core/level/index.ts';
import { runHeadless } from '../../../src/core/simulation/index.ts';
import { addBody, addEntity, addJoint, addSurface, at, rectangle } from '../../levels/determinism/build/levelParts.ts';

// Three seconds of play, long enough for every setting to show.
const TICKS = 180;
const START = { clockTimeMs: 0 };

type Changes = Partial<JointValues>;

const engine = new Box2dPhysicsEngine();

beforeAll(async () => {
    await engine.load();
});

// A 40 px door pinned by a Hinge at the origin to a Static post, its centre 40 px to the right of the pin,
// or to the left when side is -1, so gravity swings it clockwise or anticlockwise. The post overlaps the door.
function hingedDoor(side: 1 | -1, changes: Changes) {
    const level = Level.createNew();
    const post = addSurface(addEntity(level, level.world, 'Post', at(0, 10)), rectangle(10, 30));
    const door = addBody(addSurface(addEntity(level, level.world, 'Door', at(40 * side, 0)), rectangle(40, 40)));
    addJoint(level, 'Hinge', { type: 'hinge', a: door.id, b: post.id, ...changes }, { x: 0, y: 0 });

    return level;
}

// A 40 px weight hung by a Rope or a Spring from a point 60 px above its top edge, on a Static anchor whose
// side touches the weight's side.
function hangingWeight(type: 'rope' | 'spring', changes: Changes) {
    const level = Level.createNew();
    const anchor = addSurface(addEntity(level, level.world, 'Anchor', at(30, 40)), rectangle(20, 60));
    const weight = addBody(addSurface(addEntity(level, level.world, 'Weight', at(0, 60)), rectangle(40, 40)));
    addJoint(level, 'Joint', { type, a: weight.id, b: anchor.id, ...changes }, { x: 0, y: 40 }, { x: 0, y: -20 });

    return level;
}

function endState(level: Level) {
    const outcome = runHeadless(new LevelWriter().write(level), engine, { ticks: TICKS, start: START });
    if (!outcome.ok) throw new Error(`The level was refused: ${JSON.stringify(outcome.refusal)}`);

    return outcome.value.at(-1)?.hash;
}

type SettingCase = {
    readonly setting: string;
    readonly build: (changes: Changes) => Level;
    // What the default run already has on, such as Motor for Motor speed.
    readonly base: Changes;
    readonly changed: Changes;
};

const door = (changes: Changes) => hingedDoor(1, changes);
const leftDoor = (changes: Changes) => hingedDoor(-1, changes);
const rope = (changes: Changes) => hangingWeight('rope', changes);
const spring = (changes: Changes) => hangingWeight('spring', changes);
const NOT_MATCHED = { matchDrawnDistance: false };
const MOTOR = { motor: true };
const LIMITS = { limitRotation: true };

const CASES: readonly SettingCase[] = [
    {
        setting: 'Hinge, Let connected objects collide',
        build: door,
        base: {},
        changed: { letConnectedObjectsCollide: true },
    },
    { setting: 'Hinge, Limit rotation', build: door, base: {}, changed: LIMITS },
    { setting: 'Hinge, Min angle', build: leftDoor, base: LIMITS, changed: { minAngle: -20 } },
    { setting: 'Hinge, Max angle', build: door, base: LIMITS, changed: { maxAngle: 20 } },
    { setting: 'Hinge, Motor', build: door, base: {}, changed: MOTOR },
    { setting: 'Hinge, Motor speed', build: door, base: MOTOR, changed: { motorSpeed: -90 } },
    { setting: 'Hinge, Motor strength', build: door, base: MOTOR, changed: { motorStrength: 1 } },
    { setting: 'Hinge, Resistance', build: door, base: {}, changed: { resistance: 20 } },
    {
        setting: 'Rope, Let connected objects collide',
        build: rope,
        base: {},
        changed: { letConnectedObjectsCollide: false },
    },
    { setting: 'Rope, Match drawn distance', build: rope, base: {}, changed: { ...NOT_MATCHED, length: 100 } },
    { setting: 'Rope, Length', build: rope, base: NOT_MATCHED, changed: { length: 90 } },
    {
        setting: 'Spring, Let connected objects collide',
        build: spring,
        base: {},
        changed: { letConnectedObjectsCollide: false },
    },
    { setting: 'Spring, Match drawn distance', build: spring, base: {}, changed: { ...NOT_MATCHED, restLength: 100 } },
    { setting: 'Spring, Rest length', build: spring, base: NOT_MATCHED, changed: { restLength: 90 } },
    { setting: 'Spring, Stiffness', build: spring, base: {}, changed: { stiffness: 8 } },
    { setting: 'Spring, Damping', build: spring, base: {}, changed: { damping: 1 } },
];

describe('each joint setting changes what the run does', () => {
    test.each(CASES)('$setting', ({ build, base, changed }) => {
        const usual = endState(build(base));
        const withSetting = endState(build({ ...base, ...changed }));

        expect(usual).toBeDefined();
        expect(withSetting).not.toBe(usual);
    });

    test('a run without changes gives the same end state twice', () => {
        expect(endState(door(MOTOR))).toBe(endState(door(MOTOR)));
        expect(endState(spring({}))).toBe(endState(spring({})));
    });
});

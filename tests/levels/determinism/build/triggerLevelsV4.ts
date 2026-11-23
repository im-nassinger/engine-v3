import { VariablesComponent } from '../../../../src/core/components/index.ts';
import { Level } from '../../../../src/core/level/index.ts';
import type { Entity } from '../../../../src/core/level/index.ts';

import { addBody, addEntity, addSurface, at, circle, rectangle } from './levelParts.ts';
import {
    changeOwnVariable,
    changeVariable,
    fireAtTagged,
    giveOwnVariables,
    giveTags,
    giveTriggers,
    inputHeld,
    otherHasTag,
    pushBy,
    setOwnSensor,
    wait,
} from './triggerParts.ts';

// A ball the recorded inputs push right over a sensor button, which counts its own `presses` and fires
// `open` at both doors. Each door sets its own `door_open`, counts on the World's `opened`, turns into a
// sensor so the ball can pass, waits (1 s, then 2 s) and closes again, while the ball rolls through both
// and stops at a wall. Pressing `jump` flips the World's
// boolean `lights`, and each time it becomes true the World's `lit` counts.
export function triggerDoors() {
    const level = Level.createNew();
    level.world.addComponent(
        new VariablesComponent({
            variables: [
                { name: 'opened', value: 0 },
                { name: 'lights', value: false },
                { name: 'lit', value: 0 },
            ],
        }),
    );
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    addSurface(addEntity(level, level.world, 'Wall', at(700, 200)), rectangle(20, 200));
    const ball = addEntity(level, level.world, 'Ball', at(-600, 270));
    addBody(addSurface(ball, circle(20), { friction: 0.6 }));
    giveTags(ball, ['player']);

    const button = addEntity(level, level.world, 'Button', at(-200, 285));
    addSurface(button, rectangle(60, 10), { sensor: true });
    giveOwnVariables(button, { presses: 0 });
    giveTriggers(button, [
        {
            when: { kind: 'touched' },
            checks: [otherHasTag('player')],
            actions: [changeOwnVariable('presses', 'add', 1), fireAtTagged('door', 'open')],
        },
    ]);

    addDoor(level, 'Door 1', 0, 1);
    addDoor(level, 'Door 2', 400, 2);

    giveTriggers(level.world, [
        { when: inputHeld('right'), actions: [pushBy(ball, 4, 0)] },
        {
            when: { kind: 'input', input: 'jump', how: 'pressed' },
            actions: [changeVariable(level, 'lights', 'flip', null)],
        },
        {
            when: {
                kind: 'variableChanged',
                variable: { owner: 'level', name: 'lights' },
                becomes: { compare: 'is', value: true },
            },
            actions: [changeVariable(level, 'lit', 'add', 1)],
        },
    ]);

    return level;
}

function addDoor(level: Level, name: string, x: number, seconds: number): Entity {
    const door = addEntity(level, level.world, name, at(x, 230));
    addSurface(door, rectangle(20, 120));
    giveTags(door, ['door']);
    giveOwnVariables(door, { door_open: false });
    giveTriggers(door, [
        {
            when: { kind: 'custom', name: 'open' },
            actions: [
                changeOwnVariable('door_open', 'set', true),
                changeVariable(level, 'opened', 'add', 1),
                setOwnSensor(true),
                wait(seconds),
                setOwnSensor(false),
                changeOwnVariable('door_open', 'set', false),
            ],
        },
    ]);

    return door;
}

const BRICK_XS = [-200, 0, 200];

// A ball the recorded inputs push left into a wall and then right through three bricks. The ball counts
// its own `hits` on every collision; a brick hit by the ball destroys itself, and its Destroyed trigger adds
// to the World's `score`; a World trigger wins when `score` becomes 3 or more.
export function triggerHits() {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'score', value: 0 }] }));
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    addSurface(addEntity(level, level.world, 'Wall', at(-700, 200)), rectangle(20, 200));
    const ball = addEntity(level, level.world, 'Ball', at(-500, 270));
    addBody(addSurface(ball, circle(20), { friction: 0.6, restitution: 0.3 }));
    giveTags(ball, ['ball']);
    giveOwnVariables(ball, { hits: 0 });
    giveTriggers(ball, [{ when: { kind: 'collision' }, actions: [changeOwnVariable('hits', 'add', 1)] }]);

    BRICK_XS.forEach((x, i) => {
        const brick = addEntity(level, level.world, `Brick ${i + 1}`, at(x, 250));
        addSurface(brick, rectangle(30, 80));
        giveTags(brick, ['brick']);
        giveTriggers(brick, [
            {
                when: { kind: 'collision' },
                checks: [otherHasTag('ball')],
                actions: [{ kind: 'destroy', target: { kind: 'this' } }],
            },
            { when: { kind: 'destroyed' }, actions: [changeVariable(level, 'score', 'add', 1)] },
        ]);
    });

    giveTriggers(level.world, [
        { when: inputHeld('right'), actions: [pushBy(ball, 4, 0)] },
        { when: inputHeld('left'), actions: [pushBy(ball, -4, 0)] },
        {
            when: {
                kind: 'variableChanged',
                variable: { owner: 'level', name: 'score' },
                becomes: { compare: 'atLeast', value: 3 },
            },
            actions: [{ kind: 'win' }],
        },
    ]);

    return level;
}

import { VariablesComponent } from '../../../../src/core/components/index.ts';
import { Level } from '../../../../src/core/level/index.ts';
import type { Entity } from '../../../../src/core/level/index.ts';

import type { Action } from '../../../../src/core/fields/index.ts';

import { addBody, addEntity, addShape, addSurface, at, circle, rectangle } from './levelParts.ts';
import {
    addVelocity,
    changeOwnVariable,
    changeVariable,
    fireAtTagged,
    giveOwnVariables,
    giveTags,
    giveTriggers,
    inputHeld,
    otherHasTag,
    wait,
} from './triggerParts.ts';

// A ball the recorded inputs push right over a pass-through button, which counts its own `presses` and fires
// `open` at both doors. Each door, a Static body, sets its own `door_open`, counts on the World's `opened`,
// moves up so the ball can pass, waits (1 s, then 2 s) and comes down again, while the ball rolls through
// both and stops at a wall. Pressing `jump` flips the World's
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
    addShape(button, rectangle(60, 10));
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
        { when: inputHeld('right'), actions: [addVelocity(ball, 4, 0)] },
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
    addBody(addSurface(door, rectangle(20, 120)), { type: 'static' });
    giveTags(door, ['door']);
    giveOwnVariables(door, { door_open: false });
    giveTriggers(door, [
        {
            when: { kind: 'custom', name: 'open' },
            actions: [
                changeOwnVariable('door_open', 'set', true),
                changeVariable(level, 'opened', 'add', 1),
                moveOwn('add', DOOR_LIFT),
                wait(seconds),
                moveOwn('subtract', DOOR_LIFT),
                changeOwnVariable('door_open', 'set', false),
            ],
        },
    ]);

    return door;
}

const DOOR_LIFT = { x: 0, y: -200 };

function moveOwn(op: 'add' | 'subtract', by: { readonly x: number; readonly y: number }): Action {
    return {
        kind: 'change',
        target: { kind: 'this' },
        value: { kind: 'field', component: 'TransformComponent', field: 'position' },
        op,
        amount: by,
    };
}

const BRICK_XS = [-200, 0, 200];

// A ball the recorded inputs push left into a wall and then right through three bricks, all solid. The
// ball counts its own `hits` each time it starts touching something; a brick touched by the ball adds to
// the World's `score` and destroys itself; a World trigger wins when `score` becomes 3 or more.
export function triggerHits() {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'score', value: 0 }] }));
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    addSurface(addEntity(level, level.world, 'Wall', at(-700, 200)), rectangle(20, 200));
    const ball = addEntity(level, level.world, 'Ball', at(-500, 270));
    addBody(addSurface(ball, circle(20), { friction: 0.6, restitution: 0.3 }));
    giveTags(ball, ['ball']);
    giveOwnVariables(ball, { hits: 0 });
    giveTriggers(ball, [{ when: { kind: 'touched' }, actions: [changeOwnVariable('hits', 'add', 1)] }]);

    BRICK_XS.forEach((x, i) => {
        const brick = addEntity(level, level.world, `Brick ${i + 1}`, at(x, 250));
        addSurface(brick, rectangle(30, 80));
        giveTags(brick, ['brick']);
        giveTriggers(brick, [
            {
                when: { kind: 'touched' },
                checks: [otherHasTag('ball')],
                actions: [changeVariable(level, 'score', 'add', 1), { kind: 'destroy', target: { kind: 'this' } }],
            },
        ]);
    });

    giveTriggers(level.world, [
        { when: inputHeld('right'), actions: [addVelocity(ball, 4, 0)] },
        { when: inputHeld('left'), actions: [addVelocity(ball, -4, 0)] },
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

import type { Condition } from '../../../../src/core/fields/index.ts';
import { Level } from '../../../../src/core/level/index.ts';

import { addBody, addEntity, addShape, addSurface, at, circle, rectangle } from './levelParts.ts';
import {
    addVelocity,
    changeVariable,
    giveTags,
    giveTriggers,
    giveVariables,
    inputHeld,
    otherHasTag,
    switchTrigger,
} from './triggerParts.ts';

const COIN_XS = [-400, -200, 0, 200, 400];
const COINS_ALL: Condition = { compare: 'atLeast', value: COIN_XS.length };

// A ball the recorded inputs push right and left along a floor, across five pass-through coins (a shape with
// no Surface) that count themselves on the World's `coins` and destroy themselves; a World trigger wins when
// `coins` becomes 5 or more.
export function triggerCoins() {
    const level = Level.createNew();
    giveVariables(level, ['coins']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    const ball = addEntity(level, level.world, 'Ball', at(-600, 270));
    addBody(addSurface(ball, circle(20), { friction: 0.6 }));
    giveTags(ball, ['player']);

    COIN_XS.forEach((x, i) => {
        const coin = addEntity(level, level.world, `Coin ${i + 1}`, at(x, 265));
        addShape(coin, circle(15));
        giveTags(coin, ['coin']);
        giveTriggers(coin, [
            {
                when: { kind: 'touched' },
                checks: [otherHasTag('player')],
                actions: [changeVariable(level, 'coins', 'add', 1), { kind: 'destroy', target: { kind: 'this' } }],
            },
        ]);
    });

    giveTriggers(level.world, [
        { when: inputHeld('right'), actions: [addVelocity(ball, 4, 0)] },
        { when: inputHeld('left'), actions: [addVelocity(ball, -4, 0)] },
        {
            when: { kind: 'variableChanged', variable: { owner: 'level', name: 'coins' }, becomes: COINS_ALL },
            actions: [{ kind: 'win' }],
        },
    ]);

    return level;
}

// The World's timers: every 0.5 s a ball hops and `beats` counts; after 2 s `late` is set; after 4 s the
// beat is switched off, and pressing `up` switches it on again, counting from then; holding `jump` adds
// to `held` every tick.
export function triggerTimers() {
    const level = Level.createNew();
    giveVariables(level, ['beats', 'late', 'held']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(800, 20));
    const ball = addEntity(level, level.world, 'Ball', at(0, 200));
    addBody(addSurface(ball, circle(20), { restitution: 0.2 }));

    giveTriggers(level.world, [
        {
            when: { kind: 'every', time: 0.5, unit: 'seconds' },
            actions: [changeVariable(level, 'beats', 'add', 1), addVelocity(ball, 0, -150)],
        },
        { when: { kind: 'after', time: 2, unit: 'seconds' }, actions: [changeVariable(level, 'late', 'set', 1)] },
        { when: { kind: 'after', time: 4, unit: 'seconds' }, actions: [switchTrigger(level.world, 1, false)] },
        { when: inputHeld('jump'), actions: [changeVariable(level, 'held', 'add', 1)] },
        { when: { kind: 'input', input: 'up', how: 'pressed' }, actions: [switchTrigger(level.world, 1, true)] },
    ]);

    return level;
}

// A cart of three merged shapes falling into a pass-through pad, which counts it once on `touches` though all
// three shapes overlap it; the recorded inputs push it out, and `leaves` counts that once.
export function triggerTouchGroups() {
    const level = Level.createNew();
    giveVariables(level, ['touches', 'leaves']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    const pad = addEntity(level, level.world, 'Pad', at(0, 250));
    addShape(pad, rectangle(300, 80));
    giveTriggers(pad, [
        { when: { kind: 'touched' }, actions: [changeVariable(level, 'touches', 'add', 1)] },
        { when: { kind: 'untouched' }, actions: [changeVariable(level, 'leaves', 'add', 1)] },
    ]);

    const cart = addBody(addEntity(level, level.world, 'Cart', at(0, 100)));
    for (const [i, x] of [-50, 0, 50].entries()) {
        addSurface(addEntity(level, cart, `Crate ${i + 1}`, at(x, 0)), rectangle(40, 30), { friction: 0.4 });
    }

    giveTriggers(level.world, [{ when: inputHeld('right'), actions: [addVelocity(cart, 12, 0)] }]);

    return level;
}

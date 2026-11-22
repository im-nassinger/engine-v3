import { Level } from '../../../../src/core/level/index.ts';

import { addBody, addEntity, addSurface, at, circle, rectangle } from './levelParts.ts';
import {
    changeVariable,
    giveTags,
    giveTriggers,
    giveVariables,
    inputHeld,
    pushBy,
    switchTrigger,
} from './triggerParts.ts';

const COIN_XS = [-400, -200, 0, 200, 400];

// A ball the recorded inputs push right and left along a floor, across five sensor coins that count
// themselves on the World's `coins` and destroy themselves; a World trigger wins when no coin is left.
export function triggerCoins() {
    const level = Level.createNew();
    giveVariables(level, ['coins']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    const ball = addEntity(level, level.world, 'Ball', at(-600, 270));
    addBody(addSurface(ball, circle(20), { friction: 0.6 }));
    giveTags(ball, ['player']);

    COIN_XS.forEach((x, i) => {
        const coin = addEntity(level, level.world, `Coin ${i + 1}`, at(x, 265));
        addSurface(coin, circle(15), { sensor: true });
        giveTags(coin, ['coin']);
        giveTriggers(coin, [
            {
                when: { kind: 'touched' },
                checks: [{ kind: 'hasTag', target: { kind: 'other' }, tag: 'player' }],
                actions: [changeVariable(level, 'coins', 'add', 1), { kind: 'destroy', target: { kind: 'this' } }],
            },
        ]);
    });

    giveTriggers(level.world, [
        { when: inputHeld('right'), actions: [pushBy(ball, 4, 0)] },
        { when: inputHeld('left'), actions: [pushBy(ball, -4, 0)] },
        { when: { kind: 'tagLeft', tag: 'coin' }, actions: [{ kind: 'win' }] },
    ]);

    return level;
}

// The World's timers: every 0.5 s a ball hops and `beats` counts; after 2 s `late` is set; after 4 s the
// beat is switched off, and pressing `up` switches it on again, counting from then; holding `jump` adds
// to `held` at most once a second.
export function triggerTimers() {
    const level = Level.createNew();
    giveVariables(level, ['beats', 'late', 'held']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(800, 20));
    const ball = addEntity(level, level.world, 'Ball', at(0, 200));
    addBody(addSurface(ball, circle(20), { restitution: 0.2 }));

    giveTriggers(level.world, [
        {
            when: { kind: 'every', seconds: 0.5 },
            actions: [changeVariable(level, 'beats', 'add', 1), pushBy(ball, 0, -150)],
        },
        { when: { kind: 'after', seconds: 2 }, actions: [changeVariable(level, 'late', 'set', 1)] },
        { when: { kind: 'after', seconds: 4 }, actions: [switchTrigger(level.world, 1, false)] },
        {
            when: inputHeld('jump'),
            actions: [changeVariable(level, 'held', 'add', 1)],
            repeat: { kind: 'atMostEvery', seconds: 1 },
        },
        { when: { kind: 'input', input: 'up', how: 'pressed' }, actions: [switchTrigger(level.world, 1, true)] },
    ]);

    return level;
}

// A cart of three merged shapes falling into a sensor pad, which counts it once on `touches` though all
// three shapes overlap it; the recorded inputs push it out, and `leaves` counts that once.
export function triggerTouchGroups() {
    const level = Level.createNew();
    giveVariables(level, ['touches', 'leaves']);
    addSurface(addEntity(level, level.world, 'Floor', at(0, 300)), rectangle(1600, 20));
    const pad = addEntity(level, level.world, 'Pad', at(0, 250));
    addSurface(pad, rectangle(300, 80), { sensor: true });
    giveTriggers(pad, [
        { when: { kind: 'touched' }, actions: [changeVariable(level, 'touches', 'add', 1)] },
        { when: { kind: 'untouched' }, actions: [changeVariable(level, 'leaves', 'add', 1)] },
    ]);

    const cart = addBody(addEntity(level, level.world, 'Cart', at(0, 100)));
    for (const [i, x] of [-50, 0, 50].entries()) {
        addSurface(addEntity(level, cart, `Crate ${i + 1}`, at(x, 0)), rectangle(40, 30), { friction: 0.4 });
    }

    giveTriggers(level.world, [{ when: inputHeld('right'), actions: [pushBy(cart, 12, 0)] }]);

    return level;
}

import { describe, expect, test } from 'vitest';

import type { TickInputs } from './TickInputs.ts';

import { InputState } from './InputState.ts';

const INPUT_KEYS = new Map([
    ['jump', ['Space', 'KeyW']],
    ['left', ['KeyA']],
]);

function ticks(...perTick: TickInputs[]) {
    const unknown: string[] = [];
    const states: InputState[] = [];
    let down: ReadonlySet<string> = new Set();

    for (const inputs of perTick) {
        const state = new InputState(down, inputs, INPUT_KEYS, (name) => unknown.push(name));
        states.push(state);
        down = state.downKeys;
    }

    return { states, unknown };
}

function held(...keys: string[]): TickInputs {
    return { heldKeys: keys, pressedKeys: [] };
}

function pressed(heldKeys: string[], pressedKeys: string[]): TickInputs {
    return { heldKeys, pressedKeys };
}

describe('InputState', () => {
    test('a key is pressed on its first tick, held while down and released on the tick after it goes up', () => {
        const { states } = ticks(pressed(['Space'], ['Space']), held('Space'), held());

        expect(states.map((state) => state.key('Space'))).toEqual([
            { pressed: true, released: false, held: true },
            { pressed: false, released: false, held: true },
            { pressed: false, released: true, held: false },
        ]);
    });

    test('a press shorter than a tick is counted once: pressed and held one tick, then released', () => {
        const { states } = ticks(pressed([], ['KeyA']), held(), held());

        expect(states.map((state) => state.key('KeyA'))).toEqual([
            { pressed: true, released: false, held: true },
            { pressed: false, released: true, held: false },
            { pressed: false, released: false, held: false },
        ]);
    });

    test('a key down at the start without a press is held, not pressed', () => {
        const { states } = ticks(held('KeyA'));

        expect(states[0]?.key('KeyA')).toEqual({ pressed: false, released: false, held: true });
    });

    test('an input is pressed, held and released through any of its keys', () => {
        const { states } = ticks(pressed(['KeyW'], ['KeyW']), held('KeyW'), held());

        expect(states.map((state) => state.input('jump'))).toEqual([
            { pressed: true, released: false, held: true },
            { pressed: false, released: false, held: true },
            { pressed: false, released: true, held: false },
        ]);
    });

    test('two keys on one input keep it held until both are up, with no second press', () => {
        const { states } = ticks(
            pressed(['Space'], ['Space']),
            pressed(['Space', 'KeyW'], ['KeyW']),
            held('KeyW'),
            held(),
        );

        expect(states.map((state) => state.input('jump'))).toEqual([
            { pressed: true, released: false, held: true },
            { pressed: false, released: false, held: true },
            { pressed: false, released: false, held: true },
            { pressed: false, released: true, held: false },
        ]);
    });

    test('a key let go and pressed again between two ticks is a new press', () => {
        const { states } = ticks(pressed(['Space'], ['Space']), pressed(['Space'], ['Space']));

        expect(states[1]?.key('Space').pressed).toBe(true);
        expect(states[1]?.input('jump').pressed).toBe(true);
    });

    test('isKey and isInput read one state by its Press word', () => {
        const { states } = ticks(pressed(['KeyA'], ['KeyA']));

        expect(states[0]?.isKey('KeyA', 'pressed')).toBe(true);
        expect(states[0]?.isKey('KeyA', 'released')).toBe(false);
        expect(states[0]?.isInput('left', 'held')).toBe(true);
    });

    test('an unknown input reads as not held and is passed on', () => {
        const { states, unknown } = ticks(pressed(['Space'], ['Space']));

        expect(states[0]?.input('fire')).toEqual({ pressed: false, released: false, held: false });
        expect(unknown).toEqual(['fire']);
    });
});

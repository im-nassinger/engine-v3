import type { TickInputs } from '../../../../src/core/simulation/index.ts';

// One key held down: pressed on tick `from` and held through tick `to`, by its KeyboardEvent.code.
export type KeyHold = { readonly key: string; readonly from: number; readonly to: number };

// What the player does in each determinism level that reads keys, as the game worker would be handed it:
// one tick per batch, so a press is on the first tick a key is held. A level not listed has no inputs.
export const RECORDED_INPUTS: Readonly<Record<string, readonly KeyHold[]>> = {
    'trigger-coins': [
        { key: 'ArrowRight', from: 30, to: 150 },
        { key: 'KeyA', from: 200, to: 215 },
        { key: 'KeyD', from: 240, to: 420 },
    ],
    'trigger-timers': [
        { key: 'Space', from: 60, to: 330 },
        { key: 'ArrowUp', from: 420, to: 423 },
    ],
    'trigger-touch-groups': [{ key: 'ArrowRight', from: 240, to: 300 }],
};

// The level's recorded inputs, tick by tick from 1.
export function recordedInputsOf(name: string): (tick: number) => TickInputs {
    const holds = RECORDED_INPUTS[name] ?? [];

    return (tick) => ({
        heldKeys: holds.filter((hold) => hold.from <= tick && tick <= hold.to).map((hold) => hold.key),
        pressedKeys: holds.filter((hold) => hold.from === tick).map((hold) => hold.key),
    });
}

import type { TickInputs } from '../../../../../src/core/simulation/index.ts';

// One key held down: pressed on tick `from` and held through tick `to`, by its KeyboardEvent.code.
export type KeyHold = { readonly key: string; readonly from: number; readonly to: number };

export function recordedInputs(holds: readonly KeyHold[]): (tick: number) => TickInputs {
    return (tick) => ({
        heldKeys: holds.filter((hold) => hold.from <= tick && tick <= hold.to).map((hold) => hold.key),
        pressedKeys: holds.filter((hold) => hold.from === tick).map((hold) => hold.key),
    });
}

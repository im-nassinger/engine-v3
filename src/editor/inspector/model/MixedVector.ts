import type { Mixed } from './MIXED.ts';

// A vector field's value when the selected entities hold different vectors: each axis is the one value
// they share, or MIXED, so Position shows a shared x while its y reads Mixed.
export type MixedVector = {
    readonly x: number | Mixed;
    readonly y: number | Mixed;
};

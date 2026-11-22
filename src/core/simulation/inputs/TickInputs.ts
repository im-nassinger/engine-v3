// What the player does during one tick, each key by its KeyboardEvent.code, such as 'ArrowRight'.
// heldKeys: the keys held down when the batch was sent. pressedKeys: the keys that went down since the
// batch before, even those already up again, so a press shorter than a tick still counts; only a batch's
// first tick carries them.
export type TickInputs = {
    readonly heldKeys: readonly string[];
    readonly pressedKeys: readonly string[];
};

export const NO_INPUTS: TickInputs = { heldKeys: [], pressedKeys: [] };

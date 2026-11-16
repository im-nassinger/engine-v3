// What the player holds during one tick: each key by its KeyboardEvent.code, such as 'ArrowRight'.
export type TickInputs = {
    readonly heldKeys: readonly string[];
};

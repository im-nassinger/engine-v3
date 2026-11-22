// One key's or one input's state in a tick. pressed: it went down this tick. released: it was down the
// tick before and is up now. held: it is down this tick, which a press shorter than a tick also is.
export type KeyState = {
    readonly pressed: boolean;
    readonly released: boolean;
    readonly held: boolean;
};

export const KEY_UP: KeyState = { pressed: false, released: false, held: false };

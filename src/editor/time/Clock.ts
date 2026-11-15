// The time now, in milliseconds. The editor never calls Date.now itself, so its tests run on ManualClock.
export type Clock = {
    nowMs(): number;
};

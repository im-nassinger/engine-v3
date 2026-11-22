const TICKS_PER_SECOND = 60;

// A trigger's time in whole ticks, so timers never drift and slow down with the game speed.
export function secondsToTicks(seconds: number) {
    return Math.round(seconds * TICKS_PER_SECOND);
}

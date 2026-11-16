import type { TimeOfDay } from '../TimeOfDay.ts';

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;

// A TimeOfDay for tests: a time zone a whole number of minutes ahead of UTC, 0 when not given.
export class FixedZoneTimeOfDay implements TimeOfDay {
    private readonly offsetMinutes: number;

    constructor(offsetMinutes = 0) {
        this.offsetMinutes = offsetMinutes;
    }

    localTimeOf(ms: number) {
        const minutesIntoDay = mod(Math.floor(ms / MINUTE_MS) + this.offsetMinutes, DAY_MINUTES);

        return { hours: Math.floor(minutesIntoDay / 60), minutes: minutesIntoDay % 60 };
    }
}

function mod(value: number, by: number) {
    return ((value % by) + by) % by;
}

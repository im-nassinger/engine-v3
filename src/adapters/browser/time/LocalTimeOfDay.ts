import type { TimeOfDay } from '../../../editor/time/index.ts';

// The browser's own time zone behind the editor's TimeOfDay contract.
export class LocalTimeOfDay implements TimeOfDay {
    localTimeOf(ms: number) {
        const moment = new Date(ms);

        return { hours: moment.getHours(), minutes: moment.getMinutes() };
    }
}

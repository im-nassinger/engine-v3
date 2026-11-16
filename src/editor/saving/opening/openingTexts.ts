import type { ReadRefusal } from '../../../core/level-data/index.ts';
import type { TimeOfDay } from '../../time/index.ts';

export const NOTHING_SAVED_TEXT = 'Nothing will be saved in this browser';

const MEGABYTE = 1024 * 1024;

// "Recovered from your last save at 14:32. The last few seconds may be missing.", in 24-hour local time.
export function crashNoteText(savedAtMs: number, timeOfDay: TimeOfDay) {
    const { hours, minutes } = timeOfDay.localTimeOf(savedAtMs);
    const time = `${twoDigits(hours)}:${twoDigits(minutes)}`;

    return `Recovered from your last save at ${time}. The last few seconds may be missing.`;
}

export function damagedNoticeText(refusal: ReadRefusal) {
    return `The saved level couldn't be opened: ${refusalReason(refusal)}. It is kept, and you can export its raw data.`;
}

// The reason in plain words, never the reader's detail, which is for developers.
function refusalReason(refusal: ReadRefusal) {
    switch (refusal.reason) {
        case 'notALevel':
            return "it isn't a level";
        case 'damaged':
            return 'it is damaged';
        case 'newerVersion':
            return 'it was made by a newer version of the game';
        case 'overLimit':
            return overLimitReason(refusal.limit, refusal.max);
    }
}

export function overLimitReason(limit: 'entities' | 'depth' | 'points' | 'size', max: number) {
    switch (limit) {
        case 'entities':
            return `it has more than ${groupDigits(max)} entities`;
        case 'depth':
            return `its groups are nested more than ${groupDigits(max)} deep`;
        case 'points':
            return `a shape has more than ${groupDigits(max)} points`;
        case 'size':
            return `it is over ${groupDigits(Math.round(max / MEGABYTE))} MB`;
    }
}

function twoDigits(value: number) {
    return String(value).padStart(2, '0');
}

// 100000 as 100,000, the same in every browser language.
function groupDigits(value: number) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

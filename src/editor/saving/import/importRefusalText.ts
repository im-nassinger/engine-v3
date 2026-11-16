import type { ReadRefusal } from '../../../core/level-data/index.ts';

import { overLimitReason } from '../opening/openingTexts.ts';

const MEGABYTE = 1024 * 1024;

// The import's message in its notice dialog, in plain words. The reader's detail is for developers, so a
// damaged file isn't told apart by it.
export function importRefusalText(refusal: ReadRefusal) {
    switch (refusal.reason) {
        case 'notALevel':
            return "This file isn't a level";
        case 'damaged':
            return 'This level file is damaged';
        case 'newerVersion':
            return 'This level was made by a newer version of the game';
        case 'overLimit':
            return overLimitText(refusal);
    }
}

function overLimitText(refusal: ReadRefusal & { readonly reason: 'overLimit' }) {
    if (refusal.limit === 'size') {
        const megabytes = Math.round(refusal.max / MEGABYTE);

        return `This file is too big: a level holds at most ${megabytes} MB`;
    }

    const reason = overLimitReason(refusal.limit, refusal.max);

    return `This level is over a limit: ${reason}`;
}

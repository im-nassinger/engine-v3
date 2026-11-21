import type { LimitName, ReadRefusal } from '../../../core/level-data/index.ts';

const CANT_READ = "The pasted entities can't be read";

// The message pill's sentence for a paste the reader refused. A limit names itself with the text the editor
// already uses for it.
export function pasteRefusalText(refusal: ReadRefusal) {
    if (refusal.reason === 'overLimit') return limitText(refusal.limit, refusal.max);
    if (refusal.reason === 'newerVersion') return `${CANT_READ}: they come from a newer version of the game`;

    return `${CANT_READ}: they are damaged`;
}

function limitText(limit: LimitName, max: number) {
    const maxText = max.toLocaleString('en-US');

    if (limit === 'entities') return `A level holds at most ${maxText} entities`;
    if (limit === 'depth') return `Groups can be at most ${maxText} deep`;
    if (limit === 'points') return `A shape or path holds at most ${maxText} points`;

    return `${CANT_READ}: they are too big`;
}

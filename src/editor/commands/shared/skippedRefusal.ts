import type { SkipResult } from './skipEntities.ts';

// Why a command that skips the World and the camera has nothing left: "The World can't be deleted", or
// "Nothing selected". undefined when something is left.
export function skippedRefusal(split: SkipResult, pastParticiple: string) {
    if (split.allowed.length > 0) return undefined;

    const skippedKinds = split.skipped.map((entity) => entity.kind);
    if (skippedKinds.includes('world')) return `The World can't be ${pastParticiple}`;
    if (skippedKinds.includes('camera')) return `The camera can't be ${pastParticiple}`;

    return 'Nothing selected';
}

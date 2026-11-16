// Reasons, never sentences: editor/saving writes the sentence the user reads. 'missingFile' comes with v2's
// files.
// Which of LevelLimits a level is over. 'size' is maxBytes, 'levelSize' the World's rectangle.
export type LimitName = 'entities' | 'depth' | 'points' | 'size' | 'levelSize';

export type ReadRefusal =
    | { readonly reason: 'notALevel' }
    // The detail is for developers and tests, never shown as it is.
    | { readonly reason: 'damaged'; readonly detail: string }
    | { readonly reason: 'newerVersion'; readonly fileVersion: number }
    | { readonly reason: 'overLimit'; readonly limit: LimitName; readonly max: number };

export type ReadOutcome<T> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly refusal: ReadRefusal };

// A check that builds nothing: LevelReader.checkSubtree.
export type ReadCheck = { readonly ok: true } | { readonly ok: false; readonly refusal: ReadRefusal };

// Reasons, never sentences: the editor writes the sentence the user reads.
export type ParseProblem =
    | { readonly reason: 'wrongType' }
    | { readonly reason: 'notFinite' }
    | { readonly reason: 'zero' }
    | { readonly reason: 'tooShort'; readonly minLength: number }
    | { readonly reason: 'outsideLimits'; readonly min: number; readonly max: number }
    | { readonly reason: 'unknownChoice' }
    | { readonly reason: 'badColour' }
    | { readonly reason: 'badEntityId' }
    | { readonly reason: 'tooFewPoints'; readonly minCount: number }
    // A size typed for a line whose points are all on one row, or one column: they can't be spread.
    | { readonly reason: 'flatShape' };

export type ParseOutcome<T> =
    { readonly ok: true; readonly value: T } | { readonly ok: false; readonly problem: ParseProblem };

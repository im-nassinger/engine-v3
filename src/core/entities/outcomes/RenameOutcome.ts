export type RenameOutcome =
    | { readonly renamed: true; readonly name: string }
    | { readonly renamed: false; readonly reason: 'empty' | 'tooLong' };

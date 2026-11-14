export type MoveRefusal = 'cycle' | 'tooDeep' | 'world' | 'cameraOutsideWorld';

export type MoveOutcome = { readonly moved: true } | { readonly moved: false; readonly reason: MoveRefusal };

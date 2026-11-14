// The StyleComponent's fill in v1: nothing, or one colour written #RRGGBBAA. v2 adds gradients to the same
// tagged shape, so saved levels never change.
export type SolidFill = { readonly kind: 'none' } | { readonly kind: 'solid'; readonly colour: string };

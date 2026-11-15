export type AddComponentOutcome = { readonly added: true } | { readonly added: false; readonly reason: 'alreadyHas' };

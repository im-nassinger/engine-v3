// The same shape as editor/commands' Availability: a disabled entry's tooltip shows the reason. Declared
// again here because commands import the session, which holds the Inspector, so importing it would be a circle.
export type Availability = { readonly enabled: true } | { readonly enabled: false; readonly reason: string };

export const AVAILABLE: Availability = { enabled: true };

export function unavailable(reason: string): Availability {
    return { enabled: false, reason };
}

// With several entities, one that refuses refuses for all, with its reason.
export function firstRefusal(availabilities: readonly Availability[]) {
    const refusal = availabilities.find((availability) => !availability.enabled);

    return refusal ?? AVAILABLE;
}

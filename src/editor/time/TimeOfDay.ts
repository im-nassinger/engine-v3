// The time of day a moment falls on, in the computer's own time zone, for the texts that name a time. The editor
// never calls Date itself, so its tests can say which time zone they are in.
export type TimeOfDay = {
    // hours from 0 to 23, minutes from 0 to 59.
    localTimeOf(ms: number): { readonly hours: number; readonly minutes: number };
};

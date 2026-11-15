import { useSyncExternalStore } from 'react';
import type { Versioned } from './Versioned.ts';

// Redraws only when what is read changes, not on every version: the zoom's percentage stays put while
// the view pans, so panning never redraws the top bar. read must return a primitive, which React
// compares with Object.is.
export function useReading<Value extends string | number | boolean | undefined>(source: Versioned, read: () => Value) {
    const subscribe = (listener: () => void) => source.subscribe(listener);

    return useSyncExternalStore(subscribe, read);
}

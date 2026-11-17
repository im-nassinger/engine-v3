import { useCallback, useSyncExternalStore } from 'react';
import type { Versioned } from './Versioned.ts';

// The version is the snapshot: the component reads current values straight from the class afterwards.
export function useVersion(source: Versioned) {
    // The React Compiler would keep readVersion while source.version stays the same number. A source swapped for
    // another at the same version, as New then Import swaps the Inspector's model at 0, would then be read
    // through the old one, and the component would never redraw again.
    'use no memo';

    const subscribe = useCallback((listener: () => void) => source.subscribe(listener), [source]);
    const readVersion = useCallback(() => source.version, [source]);

    return useSyncExternalStore(subscribe, readVersion);
}

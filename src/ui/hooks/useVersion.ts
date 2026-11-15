import { useSyncExternalStore } from 'react';
import type { Versioned } from './Versioned.ts';

// The version is the snapshot: the component reads current values straight from the class afterwards.
export function useVersion(source: Versioned) {
    const subscribe = (listener: () => void) => source.subscribe(listener);
    const readVersion = () => source.version;

    return useSyncExternalStore(subscribe, readVersion);
}

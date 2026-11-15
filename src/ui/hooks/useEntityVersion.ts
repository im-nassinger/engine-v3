import { useSyncExternalStore } from 'react';
import type { EntityId, Level } from '../../core/level/index.ts';

// Redraws when this one entity changes: its name, its eye, its components or its children.
export function useEntityVersion(level: Level, id: EntityId) {
    const entityVersions = level.signals.entityVersions;
    const subscribe = (listener: () => void) => entityVersions.subscribe(id, listener);
    const readVersion = () => entityVersions.version(id);

    return useSyncExternalStore(subscribe, readVersion);
}

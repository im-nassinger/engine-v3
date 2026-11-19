import { createContext, useContext } from 'react';
import type { MinimapMount } from './MinimapMount.ts';

export const MinimapMountContext = createContext<MinimapMount | undefined>(undefined);

export function useMinimapMount() {
    const minimap = useContext(MinimapMountContext);
    if (!minimap) throw new Error('useMinimapMount needs a MinimapMountContext provider.');

    return minimap;
}

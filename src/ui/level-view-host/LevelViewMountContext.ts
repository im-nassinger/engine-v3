import { createContext, useContext } from 'react';
import type { LevelViewMount } from './LevelViewMount.ts';

export const LevelViewMountContext = createContext<LevelViewMount | undefined>(undefined);

export function useLevelViewMount() {
    const levelView = useContext(LevelViewMountContext);
    if (!levelView) throw new Error('useLevelViewMount needs a LevelViewMountContext provider.');

    return levelView;
}

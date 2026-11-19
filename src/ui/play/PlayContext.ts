import { createContext, useContext } from 'react';
import type { PlaySession } from '../../editor/play/index.ts';

// Test play, for the shell and the Play bar.
export const PlayContext = createContext<PlaySession | undefined>(undefined);

export function usePlaySession() {
    const play = useContext(PlayContext);
    if (!play) throw new Error('usePlaySession needs a PlayContext provider.');

    return play;
}

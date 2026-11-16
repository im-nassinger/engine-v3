import { createContext, useContext } from 'react';
import type { SaveIndicator } from '../../editor/saving/index.ts';

// What the page shows of saving: built by the page from the saved level's opening.
export const SaveIndicatorContext = createContext<SaveIndicator | undefined>(undefined);

export function useSaveIndicator() {
    const indicator = useContext(SaveIndicatorContext);
    if (!indicator) throw new Error('useSaveIndicator needs a SaveIndicatorContext provider.');

    return indicator;
}

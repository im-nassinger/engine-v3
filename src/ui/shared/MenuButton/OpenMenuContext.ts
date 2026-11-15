import { createContext, useContext } from 'react';
import type { RefObject } from 'react';

// What the menu a MenuButton opened needs from it: how to close, and what to open under.
export type OpenMenu = {
    readonly close: () => void;
    readonly anchor: RefObject<HTMLElement | null>;
};

export const OpenMenuContext = createContext<OpenMenu | undefined>(undefined);

export function useOpenMenu() {
    const openMenu = useContext(OpenMenuContext);
    if (!openMenu) throw new Error('useOpenMenu needs a MenuButton around it.');

    return openMenu;
}

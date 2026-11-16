import { createContext, useContext } from 'react';
import { OpenWindowCount } from '../../editor/tools/index.ts';

// Where the page's menus and the Entities panel's row drag report themselves open, so Esc leaves
// them to close. Without a provider, as in a component's own tests, nobody reads the count.
export const OpenWindowsContext = createContext<OpenWindowCount>(new OpenWindowCount());

export function useOpenWindows() {
    return useContext(OpenWindowsContext);
}

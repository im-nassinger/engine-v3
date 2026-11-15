import { createContext, useContext } from 'react';
import type { EditorSession } from '../editor/session/index.ts';

export const EditorContext = createContext<EditorSession | undefined>(undefined);

export function useEditorSession() {
    const session = useContext(EditorContext);
    if (!session) throw new Error('useEditorSession needs an EditorContext provider.');

    return session;
}

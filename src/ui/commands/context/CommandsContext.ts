import { createContext, useContext } from 'react';
import type { EditorCommands } from './EditorCommands.ts';

export const CommandsContext = createContext<EditorCommands | undefined>(undefined);

export function useCommands() {
    const commands = useContext(CommandsContext);
    if (!commands) throw new Error('useCommands needs a CommandsContext provider.');

    return commands;
}

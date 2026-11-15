import type { CommandRegistry, CommandRunner } from '../../../editor/commands/index.ts';
import type { KeyboardPlatform } from '../../../editor/shortcuts/index.ts';

// What a component needs to show and run commands: every command, the one way to run them, and how
// the menus spell a shortcut on this computer.
export type EditorCommands = {
    readonly registry: CommandRegistry;
    readonly runner: CommandRunner;
    readonly platform: KeyboardPlatform;
};

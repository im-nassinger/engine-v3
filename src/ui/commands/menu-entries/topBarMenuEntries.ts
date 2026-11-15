import { ViewSwitchCommand } from '../../../editor/commands/index.ts';
import type { EditorCommand } from '../../../editor/commands/index.ts';
import type { EditorCommands } from '../context/EditorCommands.ts';

import { commandSections } from './commandSections.ts';

function isViewSwitch(command: EditorCommand) {
    return command instanceof ViewSwitchCommand;
}

// The top bar's View menu: the switches for what the editor draws over the level.
export function viewMenuEntries({ registry, runner, platform }: EditorCommands) {
    const viewCommands = registry.menu('View');
    const switches = viewCommands.filter(isViewSwitch);

    return commandSections(switches, runner, platform);
}

// The zoom's menu: the rest of the View submenu, Zoom in to Camera frame.
export function zoomMenuEntries({ registry, runner, platform }: EditorCommands) {
    const viewCommands = registry.menu('View');
    const zoomCommands = viewCommands.filter((command) => !isViewSwitch(command));

    return commandSections(zoomCommands, runner, platform);
}

// The Help button at the top bar's right end opens the main menu's Help submenu.
export function helpMenuEntries({ registry, runner, platform }: EditorCommands) {
    const helpCommands = registry.menu('Help');

    return commandSections(helpCommands, runner, platform);
}

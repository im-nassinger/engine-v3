import type { ViewSwitch } from '../../view/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Availability, CommandOutcome, EditorCommand } from '../EditorCommand.ts';

export type ViewSwitchEntry = {
    readonly viewSwitch: ViewSwitch;
    readonly id: string;
    readonly label: string;
    readonly order: number;
    readonly shortcuts: readonly string[];
};

// One of the View menu's switches: flips what the editor draws over the level, or grid snapping. Never a step.
export class ViewSwitchCommand implements EditorCommand {
    readonly id: string;
    readonly label: string;
    readonly menu;
    readonly shortcuts: readonly string[];
    private readonly viewSwitch: ViewSwitch;
    private readonly session: EditorSession;

    constructor(session: EditorSession, entry: ViewSwitchEntry) {
        this.session = session;
        this.viewSwitch = entry.viewSwitch;
        this.id = entry.id;
        this.label = entry.label;
        this.shortcuts = entry.shortcuts;
        this.menu = { menu: 'View', section: 1, order: entry.order } as const;
    }

    availability(): Availability {
        return { enabled: true };
    }

    checked() {
        return this.session.viewSettings.isOn(this.viewSwitch);
    }

    run(): CommandOutcome {
        this.session.viewSettings.toggle(this.viewSwitch);

        return { kind: 'done' };
    }
}

export const VIEW_SWITCH_ENTRIES: readonly ViewSwitchEntry[] = [
    { viewSwitch: 'grid', id: 'view.grid', label: 'Grid', order: 10, shortcuts: ['G'] },
    { viewSwitch: 'gridSnapping', id: 'view.gridSnapping', label: 'Grid snapping', order: 15, shortcuts: ['Shift+G'] },
    { viewSwitch: 'jointIcons', id: 'view.jointIcons', label: 'Joint icons', order: 20, shortcuts: ['Shift+J'] },
    { viewSwitch: 'cameraFrame', id: 'view.cameraFrame', label: 'Camera frame', order: 30, shortcuts: ['Shift+C'] },
    { viewSwitch: 'physicsView', id: 'view.physicsView', label: 'Physics view', order: 40, shortcuts: ['Shift+P'] },
];

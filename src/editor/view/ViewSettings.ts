import { VersionCounter } from '../../core/events/index.ts';

export type ViewSwitch = 'grid' | 'gridSnapping' | 'jointIcons' | 'cameraFrame' | 'physicsView';

export type ViewSwitches = Readonly<Record<ViewSwitch, boolean>>;

// The physics view starts off because it draws over everything; the other three are what a new
// editor expects to see (standing yes, 2026-11-14). Grid snapping starts on with the grid it snaps to
// (standing yes, 2026-11-15).
export const DEFAULT_VIEW_SWITCHES: ViewSwitches = {
    grid: true,
    gridSnapping: true,
    jointIcons: true,
    cameraFrame: true,
    physicsView: false,
};

// The View menu's switches: what the editor draws over the level, and whether moves snap to the grid. Saved in the browser, never in the
// level, and never an undo step.
export class ViewSettings {
    readonly version = new VersionCounter();
    private switches: ViewSwitches;

    constructor(switches: ViewSwitches = DEFAULT_VIEW_SWITCHES) {
        this.switches = { ...switches };
    }

    isOn(viewSwitch: ViewSwitch) {
        return this.switches[viewSwitch];
    }

    all(): ViewSwitches {
        return { ...this.switches };
    }

    set(viewSwitch: ViewSwitch, on: boolean) {
        if (this.switches[viewSwitch] === on) return;

        this.switches = { ...this.switches, [viewSwitch]: on };
        this.version.increment();
    }

    toggle(viewSwitch: ViewSwitch) {
        const isOn = this.switches[viewSwitch];
        this.set(viewSwitch, !isOn);
    }
}

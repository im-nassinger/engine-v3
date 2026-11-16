import type { OpenLevel } from '../../session/index.ts';
import type { ToolController } from '../ToolController.ts';

import type { OpenWindows } from './OpenWindows.ts';

// Which of the requirement's six answers Esc gave, or none.
export type EscapeAnswer = 'drag' | 'window' | 'drawing' | 'tool' | 'group' | 'selection' | 'nothing';

// The session, read at each Esc, since New and Import replace the open level.
export type OpenLevelSource = {
    readonly openLevel: OpenLevel;
};

// Esc does the first of the requirement's six that applies, walking outward. A field being typed in
// handles its own Esc before this is asked.
export class EscapeChain {
    private readonly source: OpenLevelSource;
    private readonly tools: ToolController;
    private readonly windows: OpenWindows;

    constructor(source: OpenLevelSource, tools: ToolController, windows: OpenWindows) {
        this.source = source;
        this.tools = tools;
        this.windows = windows;
    }

    press(): EscapeAnswer {
        if (this.cancelDrag()) return 'drag';
        if (this.windows.isOpen()) return 'window';
        if (this.tools.cancelDrawing()) return 'drawing';
        if (this.tools.returnToSelect()) return 'tool';
        if (this.goUpOneGroup()) return 'group';
        if (this.clearSelection()) return 'selection';

        return 'nothing';
    }

    // The browser took the pointer away: the drag is put back, as Esc would.
    dragLost() {
        this.cancelDrag();
    }

    // The window lost focus: no button release or key up will arrive, so the drag is put back and a
    // held Space is let go.
    focusLost() {
        this.cancelDrag();
        this.tools.releaseKeys();
    }

    // The tool puts its drag back first; a live edit it left running is put back here.
    private cancelDrag() {
        const liveEdit = this.source.openLevel.liveEdit;
        const wasDragging = this.tools.isDragging || liveEdit.isActive;
        if (!wasDragging) return false;

        this.tools.cancelDrag();
        liveEdit.cancel();

        return true;
    }

    private goUpOneGroup() {
        const { currentGroup, selection } = this.source.openLevel;

        const left = currentGroup.exitOne();
        if (left === undefined) return false;

        selection.replace([left.id]);

        return true;
    }

    private clearSelection() {
        const selection = this.source.openLevel.selection;
        if (selection.isEmpty) return false;

        selection.clear();

        return true;
    }
}

import { VersionCounter } from '../../../core/events/index.ts';
import type { Tool } from '../Tool.ts';

const SELECT_HINT = 'Click to select. Drag on empty space to select with a box. Double-click goes into a group.';

// The Select tool. Its drag states come in the next steps of stage 9; until then it only takes part in
// picking, tool lock and Esc.
export class SelectTool implements Tool {
    readonly id = 'select';
    readonly hint = SELECT_HINT;
    readonly preview = new VersionCounter();

    activate() {}

    deactivate() {}

    pointerDown() {}

    pointerMove() {}

    pointerUp() {}

    keyDown() {
        return false;
    }

    keyUp() {}

    cancel() {
        return false;
    }
}

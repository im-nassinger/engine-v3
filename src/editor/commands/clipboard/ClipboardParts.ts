import type { Point } from '../../../core/geometry/index.ts';
import type { EditorClipboard } from '../../clipboard/index.ts';

// Where the mouse is over the level view, in level positions, undefined while it is outside. The page's
// MousePosition is one.
export type MouseOverView = {
    readonly current: Point | undefined;
};

// What Cut, Copy and Paste share besides the session.
export type ClipboardParts = {
    readonly clipboard: EditorClipboard;
    readonly mouse: MouseOverView;
};

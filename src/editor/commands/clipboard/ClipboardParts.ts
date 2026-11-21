import type { Point } from '../../../core/geometry/index.ts';
import type { EditorClipboard } from '../../clipboard/index.ts';

// Where the mouse is over the level view, undefined while it is outside. The page's MousePosition is one.
// current is in level positions, as the debug box shows it; screenPosition is in screen positions and
// is up to date at once, so Zoom in and Zoom out zoom at the mouse even after the view moved under it.
export type MouseOverView = {
    readonly current: Point | undefined;
    readonly screenPosition: Point | undefined;
};

// What Cut, Copy and Paste share besides the session.
export type ClipboardParts = {
    readonly clipboard: EditorClipboard;
    readonly mouse: MouseOverView;
};

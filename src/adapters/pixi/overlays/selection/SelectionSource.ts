import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { Bounds, Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';

// The handles' frame of one selected entity, in level positions: the Select tool's SelectionFrame.
export type ShownFrame = {
    // Clockwise from the top left of the entity's own space.
    readonly corners: readonly Point[];
    readonly handles: readonly Point[];
};

// The small box near the mouse during a drag. at is the mouse in level positions.
export type ShownReadout = {
    readonly text: string;
    readonly at: Point;
};

// The polygon or line whose points are being edited: its points in level positions, and the indexes of the
// selected ones.
export type ShownPoints = {
    readonly points: readonly Point[];
    readonly selected: readonly number[];
};

// What the selection overlay reads, besides the level and its caches: the editor's selection and what the
// active tool shows of it. The composition root builds it from the session and the tools.
export type SelectionSource = {
    readonly entities: readonly Entity[];
    // Undefined during a drag, so the handles hide.
    readonly frame: ShownFrame | undefined;
    // The selection box being dragged, in level positions.
    readonly selectionBox: Bounds | undefined;
    readonly readout: ShownReadout | undefined;
    // While the Select tool edits points.
    readonly editedPoints: ShownPoints | undefined;
    // With the parents' switches.
    isHidden(entity: Entity): boolean;
    isLocked(entity: Entity): boolean;
    // Any of the above changed.
    subscribe(listener: () => void): Unsubscribe;
};

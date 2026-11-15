import { VersionCounter } from '../../../../../core/events/index.ts';
import type { Unsubscribe } from '../../../../../core/events/index.ts';
import type { EntityId } from '../../../../../core/level/index.ts';
import { moveEntities } from '../../../../../editor/commands/index.ts';
import { EntitiesDrop } from '../../../../../editor/entities-panel/index.ts';
import type { DropTarget } from '../../../../../editor/entities-panel/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import type { StatusText } from '../../../../../editor/status/index.ts';
import { autoScrollSpeed } from './autoScrollSpeed.ts';
import { dropPointerAt } from './dropPointerAt.ts';

// A press becomes a drag past 3 px, as in the level view; less is a click.
const DRAG_START_DISTANCE = 3;

// The list's two elements: the one that scrolls and the content inside it, which moves with the rows.
export type RowDragElements = {
    readonly scroller: HTMLElement;
    readonly content: HTMLElement;
};

type Press = {
    readonly openLevel: OpenLevel;
    readonly entityId: EntityId;
    readonly elements: RowDragElements;
    readonly startX: number;
    readonly startY: number;
};

type Drag = {
    readonly draggedIds: readonly EntityId[];
    readonly drop: EntitiesDrop;
    target: DropTarget | undefined;
};

// One press on a row, from the button going down to the drop or Esc. It listens on the window while
// the button is held, so the drag goes on when the pressed row scrolls out of the list and stops
// existing. The list draws the drop line from `target` and redraws on `version`.
export class RowDrag {
    readonly version = new VersionCounter();

    private readonly status: StatusText;
    private press: Press | undefined;
    private drag: Drag | undefined;
    private pointerX = 0;
    private pointerY = 0;
    private scrollFrame: number | undefined;
    private stopFollowingRows: Unsubscribe | undefined;
    // A drag ends with the button's release, which the browser follows with a click on the row under
    // it. That click must not change the selection.
    private swallowsNextClick = false;

    constructor(status: StatusText) {
        this.status = status;
    }

    get target() {
        return this.drag?.target;
    }

    get isDragging() {
        return this.drag !== undefined;
    }

    // The World's row can't be dragged, so it never starts a press.
    start(openLevel: OpenLevel, entityId: EntityId, elements: RowDragElements, event: PointerEvent) {
        if (event.button !== 0) return;
        if (entityId === openLevel.level.world.id) return;

        this.end();
        this.press = { openLevel, entityId, elements, startX: event.clientX, startY: event.clientY };
        window.addEventListener('pointermove', this.handleMove);
        window.addEventListener('pointerup', this.handleUp);
        window.addEventListener('pointercancel', this.handleCancel);
        document.addEventListener('keydown', this.handleKeyDown, { capture: true });
        elements.scroller.addEventListener('scroll', this.handleScroll);
        // The keys still reach the editor during a drag, so Ctrl+Z can change the tree under it. The
        // rows the drag points at are gone then, so the drag ends as if Esc was pressed.
        this.stopFollowingRows = openLevel.entitiesRows.version.subscribe(this.handleRowsChanged);
    }

    // Any new press on the list forgets a click left over from a drag released outside every row.
    forgetClick() {
        this.swallowsNextClick = false;
    }

    // Called by the list's click handler, before a row sees the click.
    takesClick() {
        const swallows = this.swallowsNextClick;
        this.swallowsNextClick = false;

        return swallows;
    }

    dispose() {
        this.end();
    }

    private readonly handleMove = (event: PointerEvent) => {
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        if (this.drag === undefined && !this.beginDragPastStart()) return;

        this.updateTarget();
        this.keepScrolling();
    };

    private readonly handleUp = () => {
        const press = this.press;
        const drag = this.drag;
        this.end();
        if (press === undefined || drag === undefined) return;

        this.swallowsNextClick = true;
        if (drag.target === undefined) return;

        // The panel selects the moved rows itself: a drop into a folded group leaves it folded.
        const { openLevel } = press;
        const target = drag.target;
        const outcome = openLevel.selectionReveal.fromPanel(() => moveEntities(openLevel, drag.draggedIds, target));
        if (outcome.kind !== 'refused') return;

        this.status.show(outcome.reason);
    };

    private readonly handleCancel = () => {
        this.end();
    };

    // Esc cancels the drag and stops there, so no other Esc handler closes something too.
    private readonly handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape' || this.drag === undefined) return;

        event.preventDefault();
        event.stopPropagation();
        this.end();
        this.swallowsNextClick = true;
    };

    private readonly handleRowsChanged = () => {
        if (this.drag === undefined) return;

        this.end();
        this.swallowsNextClick = true;
    };

    private readonly handleScroll = () => {
        if (this.drag === undefined) return;

        this.updateTarget();
    };

    // Dragging a selected row drags the whole selection; dragging one that isn't selected selects it
    // first and drags it alone.
    private beginDragPastStart() {
        const press = this.press;
        if (press === undefined) return false;

        const distance = Math.hypot(this.pointerX - press.startX, this.pointerY - press.startY);
        if (distance < DRAG_START_DISTANCE) return false;

        const { selection, level, entitiesRows, selectionReveal } = press.openLevel;
        if (!selection.has(press.entityId)) {
            const pressedIds = [press.entityId];
            selectionReveal.fromPanel(() => selection.replace(pressedIds));
        }

        const drop = new EntitiesDrop(level, entitiesRows);
        this.drag = { draggedIds: selection.ids, drop, target: undefined };

        return true;
    }

    private updateTarget() {
        const press = this.press;
        const drag = this.drag;
        if (press === undefined || drag === undefined) return;

        const contentBox = press.elements.content.getBoundingClientRect();
        const point = { x: this.pointerX - contentBox.left, y: this.pointerY - contentBox.top };
        const rowCount = press.openLevel.entitiesRows.rows.length;
        const pointer = dropPointerAt(point, rowCount);

        const target = pointer === undefined ? undefined : drag.drop.targetAt(drag.draggedIds, pointer);
        if (isSameTarget(target, drag.target)) return;

        drag.target = target;
        this.version.increment();
    }

    // One frame at a time while the pointer is near an edge; the scroll event then moves the target.
    private keepScrolling() {
        if (this.scrollFrame !== undefined) return;

        this.scrollFrame = requestAnimationFrame(this.scrollOneFrame);
    }

    private readonly scrollOneFrame = () => {
        this.scrollFrame = undefined;
        const scroller = this.press?.elements.scroller;
        if (scroller === undefined || this.drag === undefined) return;

        const scrollerBox = scroller.getBoundingClientRect();
        const speed = autoScrollSpeed(this.pointerY, scrollerBox);
        if (speed === 0) return;

        scroller.scrollTop += speed;
        this.keepScrolling();
    };

    private end() {
        const press = this.press;
        const wasDragging = this.drag !== undefined;
        this.press = undefined;
        this.drag = undefined;

        window.removeEventListener('pointermove', this.handleMove);
        window.removeEventListener('pointerup', this.handleUp);
        window.removeEventListener('pointercancel', this.handleCancel);
        document.removeEventListener('keydown', this.handleKeyDown, { capture: true });
        press?.elements.scroller.removeEventListener('scroll', this.handleScroll);
        this.stopFollowingRows?.();
        this.stopFollowingRows = undefined;

        if (this.scrollFrame !== undefined) {
            cancelAnimationFrame(this.scrollFrame);
            this.scrollFrame = undefined;
        }

        if (wasDragging) {
            this.version.increment();
        }
    }
}

function isSameTarget(first: DropTarget | undefined, second: DropTarget | undefined) {
    if (first === undefined || second === undefined) return first === second;

    return (
        first.parentId === second.parentId &&
        first.index === second.index &&
        first.lineBelowRowIndex === second.lineBelowRowIndex &&
        first.lineDepth === second.lineDepth
    );
}

import type { Entity } from '../../../../core/level/index.ts';
import type { Unsubscribe } from '../../../../core/events/index.ts';
import type { LevelPointerInput } from '../../Tool.ts';
import { EditedPoints } from '../points/EditedPoints.ts';

import { PointPressState } from './PointPressState.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// Editing a polygon's or line's points, entered by double-clicking it. The entity stays selected, so
// the Inspector shows its Points. Ends with Esc, a press on another entity (handed to IdleState, which
// selects it), a click on empty space outside the shape's frame, a change of selection from elsewhere,
// the entity going away, or it being hidden or stopping being a polygon or line. Undo and Redo clear the selected points, since their indexes may not match.
export class PointEditState implements SelectState {
    readonly points: EditedPoints;
    private readonly host: SelectStateHost;
    private readonly unsubscribes: Unsubscribe[];
    private hasEnded = false;

    constructor(host: SelectStateHost, entity: Entity) {
        this.host = host;
        const { openLevel } = host.context;
        this.points = new EditedPoints(openLevel, entity, () => host.redraw());

        const followSelection = openLevel.selection.version.subscribe(() => this.endIfNotEditable());
        const followUndo = openLevel.history.undoneOrRedone.subscribe(() => this.points.clear());
        const followLevel = openLevel.level.signals.updated.subscribe((update) => {
            const isAboutEntity = 'entity' in update && update.entity === entity;
            if (isAboutEntity) {
                this.followEntity();
            }
        });
        this.unsubscribes = [followSelection, followUndo, followLevel];
    }

    // False once the level was replaced, or the shape stopped being a polygon or line, before the next press.
    get isEditing() {
        const isSameLevel = this.host.context.openLevel === this.points.openLevel;

        return !this.hasEnded && isSameLevel && this.points.isEditable;
    }

    pointerDown(input: LevelPointerInput) {
        if (!this.isEditing || this.pressesAnotherEntity(input)) {
            const idle = this.end();
            idle.pointerDown(input);
            return;
        }

        if (input.button !== 'left') return;

        const { zoom } = this.host.context.view;
        const pointIndex = this.points.hits().pointAt(input.levelPosition, zoom);

        // An unselected point is selected on the press, so a drag moves it; a selected one narrows on release.
        const selectsNow = pointIndex !== undefined && !input.modifiers.shift && !this.points.isSelected(pointIndex);
        if (selectsNow) {
            this.points.selectOnly(pointIndex);
        }

        this.host.goTo(new PointPressState(this.host, this, input, pointIndex));
    }

    pointerMove() {}

    // The release of the double-click that started point editing.
    pointerUp() {}

    // Esc goes back to IdleState with the entity still selected.
    cancel() {
        this.end();

        return true;
    }

    // Back to IdleState, which is returned. Safe to call twice.
    end() {
        if (!this.hasEnded) {
            this.hasEnded = true;
            for (const unsubscribe of this.unsubscribes) {
                unsubscribe();
            }
        }

        this.host.showBox(undefined);

        return this.host.goIdle();
    }

    // Another entity under the mouse and not one of the edited shape's points: the press is the Select tool's.
    private pressesAnotherEntity(input: LevelPointerInput) {
        const { zoom } = this.host.context.view;
        const isOnPoint = this.points.hits().pointAt(input.levelPosition, zoom) !== undefined;
        if (isOnPoint) return false;

        const { selectable } = this.host.picker.targetAt(input.levelPosition);

        return selectable !== undefined && selectable !== this.points.entity;
    }

    // The Inspector can change the shape's kind, hide it, or delete points from its list.
    private followEntity() {
        this.endIfNotEditable();
        this.points.dropMissing();
    }

    private endIfNotEditable() {
        if (this.hasEnded || this.points.isEditable) return;

        this.end();
    }
}

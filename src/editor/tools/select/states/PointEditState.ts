import type { Entity } from '../../../../core/level/index.ts';
import type { Unsubscribe } from '../../../../core/events/index.ts';
import { addPoint, deletePoints, nudgePoints } from '../../../commands/index.ts';
import type { CommandOutcome } from '../../../commands/index.ts';
import type { LevelPointerInput, ToolKey } from '../../Tool.ts';
import { EditedPoints } from '../points/EditedPoints.ts';
import type { EdgeHit } from '../points/PointHits.ts';
import { pointNudgeOffset } from '../points/pointNudgeOffset.ts';

import { PointPressState } from './PointPressState.ts';
import type { SelectState, SelectStateHost } from './SelectState.ts';

// Editing a polygon's or line's points, entered by double-clicking it. The entity stays selected, so
// the Entity inspector shows its Points. Ends with Esc, a press on another entity (handed to IdleState, which
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
        const addsOnEdge = input.clickCount === 2 && pointIndex === undefined;
        if (addsOnEdge) {
            const edge = this.points.hits().edgeAt(input.levelPosition, zoom);
            if (edge !== undefined) {
                this.addPointOn(edge);
                return;
            }
        }

        const selectsNow = pointIndex !== undefined && !input.modifiers.shift && !this.points.isSelected(pointIndex);
        if (selectsNow) {
            this.points.selectOnly(pointIndex);
        }

        this.host.goTo(new PointPressState(this.host, this, input, pointIndex));
    }

    pointerMove() {}

    // The release of the double-click that started point editing.
    pointerUp() {}

    // The arrows nudge the selected points and Delete or Backspace deletes them. Point editing takes these
    // keys even with no point selected, so they never move or delete the whole shape by surprise.
    keyDown(key: ToolKey) {
        if (!this.isEditing) return false;

        const isDelete = key.code === 'Delete' || key.code === 'Backspace';
        const hasModifier = key.ctrl || key.shift || key.alt;
        if (isDelete && !hasModifier) {
            this.deleteSelected();
            return true;
        }

        const { gridSize } = this.host.context.openLevel.level.editorData;
        const offset = pointNudgeOffset(key, gridSize);
        if (offset === undefined) return false;

        this.nudgeSelected(offset);

        return true;
    }

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

    private addPointOn(edge: EdgeHit) {
        const { openLevel, status } = this.host.context;
        const outcome = addPoint(openLevel, this.points.entity, edge.startIndex, edge.position);
        if (outcome.kind === 'refused') {
            status.show(outcome.reason);
            return;
        }

        this.points.selectOnly(outcome.index);
    }

    private nudgeSelected(offset: { x: number; y: number }) {
        const selected = this.points.selectedIndexes;
        if (selected.length === 0) return;

        const outcome = nudgePoints(this.host.context.openLevel, this.points.entity, selected, offset);
        this.showRefusal(outcome);
    }

    // The points after the deleted ones move down, so none stays selected.
    private deleteSelected() {
        const selected = this.points.selectedIndexes;
        if (selected.length === 0) return;

        const outcome = deletePoints(this.host.context.openLevel, this.points.entity, selected);
        if (outcome.kind === 'done') {
            this.points.clear();
        }
        this.showRefusal(outcome);
    }

    private showRefusal(outcome: CommandOutcome) {
        if (outcome.kind !== 'refused') return;

        this.host.context.status.show(outcome.reason);
    }

    // Another entity under the mouse and not one of the edited shape's points: the press is the Select tool's.
    private pressesAnotherEntity(input: LevelPointerInput) {
        const { zoom } = this.host.context.view;
        const isOnPoint = this.points.hits().pointAt(input.levelPosition, zoom) !== undefined;
        if (isOnPoint) return false;

        const { selectable } = this.host.picker.targetAt(input.levelPosition);

        return selectable !== undefined && selectable !== this.points.entity;
    }

    // The Entity inspector can change the shape's kind, hide it, or delete points from its list.
    private followEntity() {
        this.endIfNotEditable();
        this.points.dropMissing();
    }

    private endIfNotEditable() {
        if (this.hasEnded || this.points.isEditable) return;

        this.end();
    }
}

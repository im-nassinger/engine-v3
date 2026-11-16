import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../core/components/index.ts';
import type { EntityId } from '../../core/level/index.ts';
import { Selection } from '../selection/index.ts';
import { ManualClock } from '../time/testing/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changes/changesTestLevel.ts';
import { History } from './History.ts';
import type { EditedGroup } from './LevelEditor.ts';
import { LevelEditor } from './LevelEditor.ts';
import { LiveEdit } from './LiveEdit.ts';
import type { ValueTarget } from './LiveEdit.ts';

class RememberedGroup implements EditedGroup {
    path: readonly EntityId[];

    constructor(path: readonly EntityId[]) {
        this.path = path;
    }

    restore(path: readonly EntityId[]) {
        this.path = path;
    }
}

function buildLiveEdit() {
    const parts = buildChangesTestLevel();
    const { level, square, group } = parts;
    const history = new History(new ManualClock());
    const selection = new Selection(level);
    const editor = new LevelEditor({ level, history, selection, currentGroup: new RememberedGroup([level.world.id]) });
    const liveEdit = new LiveEdit(level, editor);
    const squarePosition: ValueTarget = { entityId: square.id, schema: TransformComponent.schema, key: 'position' };
    const groupRotation: ValueTarget = { entityId: group.id, schema: TransformComponent.schema, key: 'rotation' };

    return { ...parts, history, editor, liveEdit, squarePosition, groupRotation };
}

describe('LiveEdit', () => {
    test('a drag of 60 updates is one step, and the level changes on every update', () => {
        const { liveEdit, history, square, squarePosition } = buildLiveEdit();
        const transform = square.requireComponent(TransformComponent);

        liveEdit.begin([squarePosition]);
        for (let frame = 1; frame <= 60; frame += 1) {
            liveEdit.update(squarePosition, { x: frame, y: -frame });
            expect(transform.get('position')).toEqual({ x: frame, y: -frame });
        }
        expect(history.undoCount).toBe(0);
        liveEdit.commit('Move 1 entity');

        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move 1 entity');
        expect(liveEdit.isActive).toBe(false);
    });

    test('undo after commit gives the start values, and redo the last ones', () => {
        const { liveEdit, editor, level, square, squarePosition, groupRotation } = buildLiveEdit();
        const before = snapshotOf(level);

        liveEdit.begin([squarePosition, groupRotation]);
        liveEdit.update(squarePosition, { x: 10, y: 20 });
        liveEdit.update(groupRotation, 45);
        liveEdit.update(squarePosition, { x: 30, y: 40 });
        liveEdit.commit('Move 2 entities');
        const after = snapshotOf(level);

        editor.undo();
        expect(snapshotOf(level)).toEqual(before);

        editor.redo();
        expect(snapshotOf(level)).toEqual(after);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 30, y: 40 });
    });

    test('cancel writes the start values back and makes no step', () => {
        const { liveEdit, history, level, squarePosition, groupRotation } = buildLiveEdit();
        const before = snapshotOf(level);

        liveEdit.begin([squarePosition, groupRotation]);
        liveEdit.update(squarePosition, { x: 10, y: 20 });
        liveEdit.update(groupRotation, 90);

        expect(liveEdit.cancel()).toBe(true);
        expect(snapshotOf(level)).toEqual(before);
        expect(history.undoCount).toBe(0);
        expect(liveEdit.isActive).toBe(false);
    });

    test('cancel with no drag says so, for the Esc chain', () => {
        const { liveEdit } = buildLiveEdit();

        expect(liveEdit.cancel()).toBe(false);
    });

    test('a drag that ends where it started makes no step', () => {
        const { liveEdit, history, squarePosition } = buildLiveEdit();

        liveEdit.begin([squarePosition]);
        liveEdit.update(squarePosition, { x: 5, y: 5 });
        liveEdit.update(squarePosition, { x: 0, y: 0 });
        liveEdit.commit('Move 1 entity');

        expect(history.undoCount).toBe(0);
    });

    test('only begun values that changed are in the step', () => {
        const { liveEdit, editor, group, squarePosition, groupRotation } = buildLiveEdit();

        liveEdit.begin([squarePosition, groupRotation]);
        liveEdit.update(squarePosition, { x: 7, y: 8 });
        liveEdit.commit('Move 1 entity');
        group.requireComponent(TransformComponent).set('rotation', 60);

        const step = editor.undo();

        expect(step?.changes).toHaveLength(1);
        expect(group.requireComponent(TransformComponent).get('rotation')).toBe(60);
    });

    test('the start values are copies, so live updates never reach them', () => {
        const { liveEdit, editor, square, squarePosition } = buildLiveEdit();
        const transform = square.requireComponent(TransformComponent);

        liveEdit.begin([squarePosition]);
        liveEdit.update(squarePosition, { x: 3, y: 4 });
        liveEdit.commit('Move 1 entity');
        editor.undo();

        expect(transform.get('position')).toEqual({ x: 0, y: 0 });
    });

    test('a refused value keeps the last good one and the drag goes on', () => {
        const { liveEdit, group, groupRotation } = buildLiveEdit();
        const skew: ValueTarget = { entityId: group.id, schema: TransformComponent.schema, key: 'skew' };

        liveEdit.begin([groupRotation, skew]);
        const refused = liveEdit.update(skew, 120);

        expect(refused.ok).toBe(false);
        expect(group.requireComponent(TransformComponent).get('skew')).toBe(10);
        expect(liveEdit.isActive).toBe(true);
    });

    test('moves activeChanged when a drag begins and when it ends, by commit or cancel', () => {
        const { liveEdit, squarePosition } = buildLiveEdit();
        const seen: boolean[] = [];
        liveEdit.activeChanged.subscribe(() => seen.push(liveEdit.isActive));

        liveEdit.begin([squarePosition]);
        liveEdit.commit('Move 1 entity');
        liveEdit.begin([squarePosition]);
        liveEdit.cancel();
        liveEdit.cancel();

        expect(seen).toEqual([true, false, true, false]);
    });

    test('refuses a second begin, an update of a value not begun, and a commit with no drag', () => {
        const { liveEdit, squarePosition, groupRotation } = buildLiveEdit();

        expect(() => liveEdit.commit('Move')).toThrow('No live edit to commit.');
        expect(() => liveEdit.update(squarePosition, { x: 1, y: 1 })).toThrow('No live edit to update.');

        liveEdit.begin([squarePosition]);
        expect(() => liveEdit.begin([squarePosition])).toThrow('A live edit is already running.');
        expect(() => liveEdit.update(groupRotation, 5)).toThrow(/rotation on entity \d+ wasn't begun/);
    });
});

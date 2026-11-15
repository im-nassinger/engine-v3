import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../core/components/index.ts';
import type { Level } from '../../core/entities/index.ts';
import { ManualClock } from '../time/testing/index.ts';

import { buildChangesTestLevel, snapshotOf } from './changes/changesTestLevel.ts';
import { RenameLevelChange, SetSwitchChange, SetValueChange } from './changes/index.ts';
import type { LevelChange } from './changes/index.ts';
import { History } from './History.ts';
import type { NewHistoryStep } from './HistoryStep.ts';

function stepOf(label: string, changes: readonly LevelChange[], joinKey?: string): NewHistoryStep {
    return {
        label,
        changes,
        selectionBefore: [],
        selectionAfter: [],
        groupPathBefore: [],
        groupPathAfter: [],
        joinKey,
    };
}

function recordApplied(history: History, level: Level, step: NewHistoryStep) {
    for (const change of step.changes) {
        change.apply(level);
    }

    history.record(step);
}

function nudgeOf(entityId: number, fromX: number, toX: number) {
    return new SetValueChange({
        entityId,
        schema: TransformComponent.schema,
        key: 'position',
        oldValue: { x: fromX, y: 0 },
        newValue: { x: toX, y: 0 },
    });
}

describe('History', () => {
    test('undo reverts a step and redo applies it again', () => {
        const { level, square } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        const before = snapshotOf(level);

        recordApplied(history, level, stepOf('Hide Square', [new SetSwitchChange(square.id, 'hidden', false, true)]));
        const after = snapshotOf(level);

        expect(history.undoLabel).toBe('Hide Square');
        expect(history.undo(level)?.label).toBe('Hide Square');
        expect(snapshotOf(level)).toEqual(before);
        expect(history.undoLabel).toBeUndefined();
        expect(history.redoLabel).toBe('Hide Square');

        history.redo(level);
        expect(snapshotOf(level)).toEqual(after);
        expect(history.redoLabel).toBeUndefined();
    });

    test('undo reverts the changes of a step newest first', () => {
        const { level } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        const oldName = level.name;

        recordApplied(
            history,
            level,
            stepOf('Rename level', [new RenameLevelChange(oldName, 'One'), new RenameLevelChange('One', 'Two')]),
        );
        history.undo(level);

        expect(level.name).toBe(oldName);
    });

    test('with nothing to undo or redo, both return undefined and change nothing', () => {
        const { level } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        const before = snapshotOf(level);

        expect(history.undo(level)).toBeUndefined();
        expect(history.redo(level)).toBeUndefined();
        expect(snapshotOf(level)).toEqual(before);
    });

    test('a new step clears redo', () => {
        const { level, square, group } = buildChangesTestLevel();
        const history = new History(new ManualClock());

        recordApplied(history, level, stepOf('Hide Square', [new SetSwitchChange(square.id, 'hidden', false, true)]));
        history.undo(level);
        recordApplied(history, level, stepOf('Lock Group 1', [new SetSwitchChange(group.id, 'locked', false, true)]));

        expect(history.redoLabel).toBeUndefined();
        expect(history.redoCount).toBe(0);
    });

    test('keeps 512 steps: the 513th drops the oldest', () => {
        const { level, square } = buildChangesTestLevel();
        const history = new History(new ManualClock());

        for (let i = 1; i <= 513; i += 1) {
            const isOdd = i % 2 === 1;
            const change = new SetSwitchChange(square.id, 'hidden', !isOdd, isOdd);
            recordApplied(history, level, stepOf(`Step ${i}`, [change]));
        }

        expect(history.undoCount).toBe(512);
        for (let i = 0; i < 511; i += 1) {
            history.undo(level);
        }
        expect(history.undoLabel).toBe('Step 2');
        history.undo(level);
        expect(history.undo(level)).toBeUndefined();
        expect(square.isHidden).toBe(true);
    });

    test('a step with the same join key within 1 second joins the last one', () => {
        const { level, square } = buildChangesTestLevel();
        const clock = new ManualClock();
        const history = new History(clock);
        const key = `nudge:${square.id}`;

        recordApplied(history, level, stepOf('Move Square', [nudgeOf(square.id, 0, 1)], key));
        clock.advance(600);
        recordApplied(history, level, stepOf('Move Square', [nudgeOf(square.id, 1, 2)], key));
        clock.advance(600);
        recordApplied(history, level, stepOf('Move Square', [nudgeOf(square.id, 2, 3)], key));

        expect(history.undoCount).toBe(1);
        const step = history.undo(level);
        expect(step?.changes).toHaveLength(1);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 0, y: 0 });

        history.redo(level);
        expect(square.requireComponent(TransformComponent).get('position')).toEqual({ x: 3, y: 0 });
    });

    test('joining keeps the first selection and group before, and the newest after', () => {
        const { level, square } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        const first = { ...stepOf('Move Square', [nudgeOf(square.id, 0, 1)], 'k'), selectionBefore: [1] };
        const second = { ...stepOf('Move Square', [nudgeOf(square.id, 1, 2)], 'k'), selectionAfter: [2] };

        recordApplied(history, level, first);
        recordApplied(history, level, second);
        const joined = history.undo(level);

        expect(joined?.selectionBefore).toEqual([1]);
        expect(joined?.selectionAfter).toEqual([2]);
    });

    test('does not join past 1 second, with another key, without a key, or after an undo', () => {
        const { level, square } = buildChangesTestLevel();
        const clock = new ManualClock();
        const history = new History(clock);

        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 0, 1)], 'a'));
        clock.advance(1_001);
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 1, 2)], 'a'));
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 2, 3)], 'b'));
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 3, 4)]));
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 4, 5)]));
        expect(history.undoCount).toBe(5);

        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 5, 6)], 'c'));
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 6, 7)], 'c'));
        history.undo(level);
        recordApplied(history, level, stepOf('Move', [nudgeOf(square.id, 5, 8)], 'c'));
        expect(history.undoCount).toBe(6);
    });

    test('joined steps with other changes than value edits keep every change in order', () => {
        const { level, square } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        const before = snapshotOf(level);

        recordApplied(history, level, stepOf('Edit', [new SetSwitchChange(square.id, 'hidden', false, true)], 'k'));
        recordApplied(history, level, stepOf('Edit', [nudgeOf(square.id, 0, 5)], 'k'));
        const joined = history.undo(level);

        expect(joined?.changes).toHaveLength(2);
        expect(snapshotOf(level)).toEqual(before);
    });

    test('clear drops both lists, and every change of the lists moves the version', () => {
        const { level, square } = buildChangesTestLevel();
        const history = new History(new ManualClock());
        let versionMoves = 0;
        history.version.subscribe(() => {
            versionMoves += 1;
        });

        recordApplied(history, level, stepOf('Hide', [new SetSwitchChange(square.id, 'hidden', false, true)]));
        history.undo(level);
        history.redo(level);
        history.clear();

        expect(versionMoves).toBe(4);
        expect(history.undoCount).toBe(0);
        expect(history.redoCount).toBe(0);
    });
});

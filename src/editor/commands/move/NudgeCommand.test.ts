import { describe, expect, test } from 'vitest';

import { TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EditorSession } from '../../session/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { createCommandRegistry } from '../createCommandRegistry.ts';

function place(level: Level, parent: Entity, position: Point) {
    const entity = level.createEntity(parent, 0);
    const transform = new TransformComponent();
    transform.set('position', position);
    entity.addComponent(transform);

    return entity;
}

// Two entities at 101, 101 and 300, 100 (off and on the 50 px grid), and a group turned by 90° holding one.
function buildNudgeTest() {
    const level = Level.createNew();
    const square = place(level, level.world, { x: 101, y: 101 });
    const other = place(level, level.world, { x: 300, y: 100 });
    const group = place(level, level.world, { x: 500, y: 500 });
    group.requireComponent(TransformComponent).set('rotation', 90);
    const child = place(level, group, { x: 0, y: 0 });

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    const commands = createCommandRegistry(session);
    const run = (id: string) => commands.find(id)?.run();
    const { selection, history } = session.openLevel;

    return { level, square, other, child, session, timer, commands, run, selection, history };
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

describe('the nudge commands', () => {
    test('are twelve arrow chords that work only over the level view and repeat while held', () => {
        const { commands } = buildNudgeTest();
        const nudges = commands.all.filter((command) => command.id.startsWith('edit.nudge'));

        expect(nudges).toHaveLength(12);
        expect(nudges.map((command) => command.shortcuts[0])).toContain('Ctrl+Shift+Down');
        expect(nudges.every((command) => command.shortcutScope === 'levelView')).toBe(true);
        expect(nudges.every((command) => command.repeatsWhileHeld === true)).toBe(true);
        expect(nudges.every((command) => command.menu === undefined)).toBe(true);
        expect(commands.find('edit.nudgeLeft10')?.label).toBe('Move left 10 px');
    });

    test('move 1 px, 10 px with Shift and one grid step with Ctrl+Shift, never snapped', () => {
        const { square, selection, run, level } = buildNudgeTest();
        level.editorData.setGridSize(40);
        selection.replace([square.id]);

        run('edit.nudgeRight1');
        run('edit.nudgeDown10');
        run('edit.nudgeLeftGrid');
        run('edit.nudgeUpGrid');

        expect(positionOf(square)).toEqual({ x: 62, y: 71 });
    });

    test('a run of arrows within 1 s of each other is one step, and a pause starts another', () => {
        const { square, selection, run, history, timer, session } = buildNudgeTest();
        selection.replace([square.id]);

        run('edit.nudgeRight1');
        timer.advance(900);
        run('edit.nudgeRight1');
        timer.advance(900);
        run('edit.nudgeRight10');

        expect(history.undoCount).toBe(1);
        expect(history.undoLabel).toBe('Move Entity');

        timer.advance(1100);
        run('edit.nudgeRight1');
        expect(history.undoCount).toBe(2);

        session.openLevel.editor.undo();
        session.openLevel.editor.undo();
        expect(positionOf(square)).toEqual({ x: 101, y: 101 });
    });

    test('selecting something else starts a new step', () => {
        const { square, other, selection, run, history } = buildNudgeTest();

        selection.replace([square.id]);
        run('edit.nudgeRight1');
        selection.replace([other.id]);
        run('edit.nudgeRight1');

        expect(history.undoCount).toBe(2);
    });

    test("follow the level's axes inside a turned group", () => {
        const { child, selection, run } = buildNudgeTest();
        selection.replace([child.id]);

        run('edit.nudgeRight10');

        const moved = positionOf(child);
        expect(moved.x).toBeCloseTo(0, 9);
        expect(moved.y).toBeCloseTo(-10, 9);
    });

    test('refuse with nothing selected, the World, locked entities and during a drag', () => {
        const { square, level, selection, commands, session } = buildNudgeTest();
        const nudge = commands.find('edit.nudgeLeft1');

        expect(nudge?.availability()).toEqual({ enabled: false, reason: 'Nothing selected' });

        selection.replace([level.world.id]);
        expect(nudge?.run()).toEqual({ kind: 'refused', reason: "The World can't be moved" });

        square.setLocked(true);
        selection.replace([square.id]);
        expect(nudge?.availability()).toEqual({ enabled: false, reason: "Locked entities don't move" });

        square.setLocked(false);
        session.openLevel.liveEdit.begin([]);
        expect(nudge?.run()).toEqual({ kind: 'refused', reason: 'Not during a drag' });
        expect(session.openLevel.history.undoCount).toBe(0);
    });
});

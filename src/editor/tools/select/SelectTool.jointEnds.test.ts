import { describe, expect, test } from 'vitest';

import { JointComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { jointPathPoints } from '../../../core/physics/index.ts';
import { placeJoint } from '../../commands/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

const END_A = { x: 500, y: 100 };
const END_B = { x: 700, y: 100 };

// A Rope from 500, 100 to 700, 100, in empty space, joining the L polygon and the square, nothing selected.
function buildRopeTest() {
    const setup = buildPointTest();
    const { session, polygon, square } = setup;
    const placement = { type: 'rope' as const, a: polygon.id, b: square.id, endA: END_A, endB: END_B };
    const outcome = placeJoint(session.openLevel, session.reader, placement);
    if (outcome.kind !== 'placed') throw new Error(`Refused: ${outcome.reason}`);
    session.openLevel.selection.clear();

    return { ...setup, rope: setup.level.requireEntity(outcome.id) };
}

function levelEnds(rope: Entity) {
    const position = rope.requireComponent(TransformComponent).get('position');
    const ends = rope.requireComponent(JointComponent).get('ends');
    const toLevel = (end: Point) => ({ x: position.x + end.x, y: position.y + end.y });

    return { a: toLevel(ends.a), b: toLevel(ends.b) };
}

describe('SelectTool: dragging a Rope’s or Spring’s ends', () => {
    test('dragging end B moves it alone and redraws the path, as one step', () => {
        const { session, rope, drag } = buildRopeTest();

        drag(END_B, { x: 680, y: 160 });

        expect(levelEnds(rope)).toEqual({ a: END_A, b: { x: 680, y: 160 } });
        expect(rope.requireComponent(TransformComponent).get('position')).toEqual(END_A);
        const path = rope.requireComponent(PathComponent).get('path');
        expect(path).toEqual(jointPathPoints('rope', { x: 0, y: 0 }, { x: 180, y: 60 }));
        expect(rope.requireComponent(JointComponent).get('length')).toBeCloseTo(Math.sqrt(180 * 180 + 60 * 60));
        expect(session.openLevel.selection.ids).toEqual([rope.id]);
        expect(session.openLevel.history.undoLabel).toBe('Move an end of Rope 1');

        session.openLevel.editor.undo();
        expect(levelEnds(rope)).toEqual({ a: END_A, b: END_B });
    });

    test('dragging end A moves it and the joint with it, end B staying', () => {
        const { rope, drag } = buildRopeTest();

        drag({ x: 502, y: 101 }, { x: 452, y: 151 });

        expect(rope.requireComponent(TransformComponent).get('position')).toEqual({ x: 450, y: 150 });
        expect(levelEnds(rope)).toEqual({ a: { x: 450, y: 150 }, b: END_B });
    });

    test('Esc puts the end back and makes no step', () => {
        const { session, rope, tool, pointerAt } = buildRopeTest();
        const undoCount = session.openLevel.history.undoCount;

        tool.pointerDown(pointerAt(END_B));
        tool.pointerMove(pointerAt({ x: 650, y: 200 }));
        tool.cancel();

        expect(levelEnds(rope)).toEqual({ a: END_A, b: END_B });
        expect(session.openLevel.history.undoCount).toBe(undoCount);
    });

    test('in a larger selection, a drag on an end moves the whole Rope with the rest', () => {
        const { session, rope, line, drag } = buildRopeTest();
        session.openLevel.selection.replace([rope.id, line.id]);

        drag(END_B, { x: 700, y: 130 });

        expect(levelEnds(rope)).toEqual({ a: { x: 500, y: 130 }, b: { x: 700, y: 130 } });
        expect(line.requireComponent(TransformComponent).get('position')).toEqual({ x: 650, y: 330 });
    });
});

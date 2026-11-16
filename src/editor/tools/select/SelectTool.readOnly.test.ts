import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

// Inside the L, to double-click it, and its first point and the middle of its top edge in the level.
const INSIDE_L = { x: 250, y: 250 };
const FIRST_POINT = { x: 200, y: 200 };
const ON_TOP_EDGE = { x: 300, y: 202 };

function buildReadOnly() {
    const built = buildPointTest();
    built.session.makeReadOnly();

    return built;
}

function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

function geometryOf(entity: Entity) {
    return entity.requireComponent(ShapeComponent).get('geometry');
}

describe('the Select tool in a read-only level', () => {
    test('a drag on an entity selects it and moves nothing, saying why', () => {
        const { square, session, drag } = buildReadOnly();

        drag({ x: 100, y: 500 }, { x: 160, y: 530 });

        const { selection, liveEdit, history } = session.openLevel;
        expect(selection.ids).toEqual([square.id]);
        expect(positionOf(square)).toEqual({ x: 100, y: 500 });
        expect(liveEdit.isActive).toBe(false);
        expect(history.undoCount).toBe(0);
        expect(session.status.current).toBe(READ_ONLY_REASON);
    });

    test('a handle resizes nothing', () => {
        const { square, session, tool, drag } = buildReadOnly();
        session.openLevel.selection.replace([square.id]);
        const handle = tool.frame?.handlePosition({ x: 1, y: 0 });
        if (handle === undefined) throw new Error('No handle.');

        drag(handle, { x: handle.x + 40, y: handle.y });

        expect(geometryOf(square)).toEqual({ kind: 'rectangle', width: 100, height: 100 });
        expect(session.openLevel.liveEdit.isActive).toBe(false);
        expect(session.status.current).toBe(READ_ONLY_REASON);
    });

    test('a selection box still selects', () => {
        const { square, session, drag } = buildReadOnly();

        drag({ x: 20, y: 420 }, { x: 180, y: 580 });

        expect(session.openLevel.selection.ids).toContain(square.id);
    });

    test('point editing selects points but drags, nudges, deletes and adds none', () => {
        const { polygon, session, tool, click, doubleClick, drag, pressKey } = buildReadOnly();
        const before = geometryOf(polygon);
        doubleClick(INSIDE_L);
        click(FIRST_POINT);

        expect(tool.editedPoints?.selectedIndexes).toEqual([0]);

        drag(FIRST_POINT, { x: 230, y: 190 });
        pressKey('ArrowRight');
        pressKey('Delete');
        doubleClick(ON_TOP_EDGE);

        expect(geometryOf(polygon)).toEqual(before);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(session.status.current).toBe(READ_ONLY_REASON);
    });
});

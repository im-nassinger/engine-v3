import { describe, expect, test } from 'vitest';

import { READ_ONLY_REASON } from '../../history/index.ts';

import { buildShapeTest, click, drag } from './testing/shapeToolTest.ts';

describe('the Shape tool in a read-only level', () => {
    test('starts no drawing and makes no shape, saying why', () => {
        const setup = buildShapeTest();
        setup.session.makeReadOnly();
        const countBefore = setup.level.entityCount;

        drag(setup, { x: 10, y: 10 }, { x: 90, y: 60 });
        click(setup, { x: 30, y: 40 });

        expect(setup.level.entityCount).toBe(countBefore);
        expect(setup.tool.readout).toBeUndefined();
        expect(setup.controller.active.id).toBe('shape');
        expect(setup.session.status.current).toBe(READ_ONLY_REASON);
    });

    test('starts no polygon either', () => {
        const setup = buildShapeTest();
        setup.session.makeReadOnly();
        setup.tool.chooseKind('polygon');

        click(setup, { x: 10, y: 10 });
        click(setup, { x: 90, y: 10 });

        expect(setup.tool.polygonDrawing?.points ?? []).toEqual([]);
    });
});

import { describe, expect, test } from 'vitest';

import { ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import { SetValueChange } from '../../history/index.ts';

import { buildPointTest } from './testing/pointTest.ts';

// The first L point.
const FIRST_POINT = { x: 200, y: 200 };

describe('SelectTool point editing', () => {
    test('a double-click on a polygon or a line edits its points, keeping it selected with no points selected', () => {
        const { polygon, line, session, tool, doubleClick } = buildPointTest();

        doubleClick({ x: 250, y: 250 });
        expect(tool.editedPoints?.entity).toBe(polygon);
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);
        expect(session.openLevel.selection.ids).toEqual([polygon.id]);

        tool.cancel();
        doubleClick({ x: 650, y: 300 });
        expect(tool.editedPoints?.entity).toBe(line);
    });

    test('a double-click on a rectangle only selects it', () => {
        const { square, session, tool, doubleClick } = buildPointTest();

        doubleClick({ x: 100, y: 500 });

        expect(tool.editedPoints).toBeUndefined();
        expect(session.openLevel.selection.ids).toEqual([square.id]);
    });

    test('the handles hide while points are edited', () => {
        const { tool, doubleClick } = buildPointTest();

        doubleClick({ x: 250, y: 250 });

        expect(tool.frame).toBeUndefined();
    });

    test('a click selects one point, Shift+click adds and removes one, a click on the shape clears them', () => {
        const { tool, click, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        click(FIRST_POINT);
        expect(tool.editedPoints?.selectedIndexes).toEqual([0]);

        click({ x: 300, y: 300 }, { shift: true });
        click({ x: 400, y: 200 }, { shift: true });
        expect(tool.editedPoints?.selectedIndexes).toEqual([0, 1, 3]);

        click(FIRST_POINT, { shift: true });
        expect(tool.editedPoints?.selectedIndexes).toEqual([1, 3]);

        click({ x: 400, y: 200 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([1]);

        click({ x: 250, y: 250 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);
    });

    test('pressing an unselected point selects it at once, so a drag would move it', () => {
        const { tool, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        tool.pointerDown({
            levelPosition: FIRST_POINT,
            screenPosition: FIRST_POINT,
            button: 'left',
            modifiers: { shift: false, alt: false, ctrl: false },
            clickCount: 1,
        });

        expect(tool.editedPoints?.selectedIndexes).toEqual([0]);
    });

    test.each([0.5, 1, 2])('at zoom %s a point is hit within 6 screen px and not at 7', (zoom) => {
        const { session, tool, click, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });
        session.view.zoomAt({ x: 400, y: 300 }, zoom);

        // The L's inner corner at 300, 300, approached from its fill.
        click({ x: 300 - 7 / zoom, y: 300 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);

        click({ x: 300 - 6 / zoom, y: 300 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([3]);
    });

    test('a drag on empty space selects the points inside its box, Shift adding them', () => {
        const { tool, drag, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        drag({ x: 150, y: 150 }, { x: 450, y: 210 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([0, 1]);
        expect(tool.selectionBox).toBeUndefined();

        drag({ x: 150, y: 390 }, { x: 250, y: 450 }, { shift: true });
        expect(tool.editedPoints?.selectedIndexes).toEqual([0, 1, 5]);

        drag({ x: 380, y: 280 }, { x: 420, y: 320 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([2]);
    });

    test('Esc during a box drops the box and keeps editing; the next Esc ends it with the shape selected', () => {
        const { polygon, session, tool, doubleClick, click } = buildPointTest();
        doubleClick({ x: 250, y: 250 });
        click(FIRST_POINT);
        tool.pointerDown({
            levelPosition: { x: 150, y: 150 },
            screenPosition: session.view.levelToScreen({ x: 150, y: 150 }),
            button: 'left',
            modifiers: { shift: false, alt: false, ctrl: false },
            clickCount: 1,
        });
        tool.pointerMove({
            levelPosition: { x: 450, y: 450 },
            screenPosition: session.view.levelToScreen({ x: 450, y: 450 }),
            button: 'left',
            modifiers: { shift: false, alt: false, ctrl: false },
            clickCount: 1,
        });

        expect(tool.cancel()).toBe(true);
        expect(tool.selectionBox).toBeUndefined();
        expect(tool.editedPoints?.selectedIndexes).toEqual([0]);

        expect(tool.cancel()).toBe(true);
        expect(tool.editedPoints).toBeUndefined();
        expect(session.openLevel.selection.ids).toEqual([polygon.id]);
        expect(tool.cancel()).toBe(false);
    });

    test('a click on another entity selects it and ends point editing', () => {
        const { square, session, tool, click, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        click({ x: 100, y: 500 });

        expect(tool.editedPoints).toBeUndefined();
        expect(session.openLevel.selection.ids).toEqual([square.id]);
    });

    test('a click on empty space inside the frame clears the points, outside it ends point editing', () => {
        const { session, tool, click, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });
        click(FIRST_POINT);

        click({ x: 350, y: 350 });
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);

        click({ x: 500, y: 500 });
        expect(tool.editedPoints).toBeUndefined();
        expect(session.openLevel.selection.isEmpty).toBe(true);
    });

    test('a click just beside a line, on its edge, stays in point editing', () => {
        const { tool, click, doubleClick } = buildPointTest();
        doubleClick({ x: 650, y: 300 });

        click({ x: 650, y: 304 });
        expect(tool.editedPoints).toBeDefined();

        click({ x: 650, y: 320 });
        expect(tool.editedPoints).toBeUndefined();
    });

    test('a change of selection from elsewhere, or the shape going away, ends point editing', () => {
        const { polygon, line, level, session, tool, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        session.openLevel.selection.replace([line.id]);
        expect(tool.editedPoints).toBeUndefined();
        expect(tool.cancel()).toBe(false);

        doubleClick({ x: 250, y: 250 });
        level.removeEntity(polygon);
        expect(tool.editedPoints).toBeUndefined();
    });

    test('the shape turned into a rectangle ends point editing', () => {
        const { polygon, tool, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        polygon.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 10, height: 10 });

        expect(tool.editedPoints).toBeUndefined();
        expect(tool.cancel()).toBe(false);
    });

    test('undo and redo clear the selected points and keep editing', () => {
        const { polygon, session, tool, click, doubleClick } = buildPointTest();
        const { editor } = session.openLevel;
        doubleClick({ x: 250, y: 250 });
        editor.edit('Move', (transaction) => {
            const change = new SetValueChange({
                entityId: polygon.id,
                schema: TransformComponent.schema,
                key: 'position',
                oldValue: { x: 300, y: 300 },
                newValue: { x: 300, y: 300.5 },
            });
            transaction.apply(change);
            return { kind: 'done' };
        });

        click(FIRST_POINT);
        editor.undo();
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);

        click(FIRST_POINT);
        editor.redo();
        expect(tool.editedPoints?.selectedIndexes).toEqual([]);
        expect(tool.editedPoints?.entity).toBe(polygon);
    });

    test('leaving the Select tool ends point editing', () => {
        const { tool, doubleClick } = buildPointTest();
        doubleClick({ x: 250, y: 250 });

        tool.deactivate();

        expect(tool.editedPoints).toBeUndefined();
        expect(tool.cancel()).toBe(false);
    });
});

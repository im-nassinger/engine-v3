import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import type { Entity } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addNamedEntity,
    buildLevel,
    click,
    panelContainer,
    requireEntity,
    findRow,
    rowNamed,
    showPanel,
    openPanelPage,
    closePanelPage,
} from './testing/panelPage.ts';

beforeEach(openPanelPage);
afterEach(closePanelPage);

async function rowShown(name: string) {
    await expect.poll(() => findRow(name)).toBeDefined();

    return rowNamed(name);
}

type Point = {
    readonly x: number;
    readonly y: number;
};

// Past the indent of a row directly inside the World, so the pointer points at depth 1.
const DEPTH_ONE_X = 8 + 16 + 4;

function pointer(type: string, target: EventTarget, point: Point) {
    const init = { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, button: 0, isPrimary: true };
    target.dispatchEvent(new PointerEvent(type, init));
}

function pointInRow(row: Element, heightFraction: number): Point {
    const box = row.getBoundingClientRect();

    return { x: box.left + DEPTH_ONE_X, y: box.top + box.height * heightFraction };
}

function list() {
    const element = panelContainer().querySelector<HTMLElement>('.entities-list');
    if (element === null) throw new Error('The panel shows its list.');

    return element;
}

function dropLine() {
    return panelContainer().querySelector('.drop-line');
}

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

// Presses on the row's name and moves past the 3 px start, so the drag has begun.
function startDrag(row: Element) {
    const name = row.querySelector('.name');
    if (name === null) throw new Error('The row shows its name.');

    const start = pointInRow(row, 0.5);
    pointer('pointerdown', name, start);
    pointer('pointermove', document, { x: start.x, y: start.y + 5 });
}

function moveTo(point: Point) {
    pointer('pointermove', document, point);
}

function release(point: Point) {
    pointer('pointerup', document, point);
}

function rowIndexOf(session: EditorSession, entity: Entity) {
    return session.openLevel.entitiesRows.indexOf(entity.id);
}

// The row the middle of the list is over, once the list has stopped scrolling.
function rowAtListMiddle() {
    const box = list().getBoundingClientRect();
    const middle = (box.top + box.bottom) / 2;
    const rows = [...panelContainer().querySelectorAll('[role="treeitem"]')];
    const row = rows.find((element) => {
        const rowBox = element.getBoundingClientRect();
        return rowBox.top <= middle && middle < rowBox.bottom;
    });
    if (row === undefined) throw new Error('A row is in the middle of the list.');

    return row;
}

// The World's row: below it lands inside the World, which is allowed.
function rowAtListTop() {
    const row = panelContainer().querySelector('[role="treeitem"]');
    if (row === null) throw new Error('The list shows the World.');

    return row;
}

describe('dragging rows', () => {
    test('at 10,000 rows, a drag across rows scrolled into view lands where its line was drawn', async () => {
        const { level, entities } = buildLevel(10_000);
        const session = showPanel(level);
        const dragged = requireEntity(entities, 9_999);
        const startIndex = rowIndexOf(session, dragged);

        startDrag(await rowShown('Crate 10000'));
        const listBox = list().getBoundingClientRect();
        moveTo({ x: listBox.left + DEPTH_ONE_X, y: listBox.bottom - 2 });
        await expect.poll(() => list().scrollTop).toBeGreaterThan(500);

        moveTo({ x: listBox.left + DEPTH_ONE_X, y: (listBox.top + listBox.bottom) / 2 });
        await nextFrame();
        await nextFrame();

        const target = rowAtListMiddle();
        moveTo(pointInRow(target, 0.85));
        await expect.poll(() => dropLine()).not.toBeNull();
        const line = dropLine();
        if (line === null) throw new Error('The drop line is drawn.');
        const lineTop = line.getBoundingClientRect().top;
        const targetBox = target.getBoundingClientRect();
        expect(Math.abs(lineTop - targetBox.bottom)).toBeLessThanOrEqual(2);

        const targetName = target.querySelector('.name')?.textContent ?? '';
        const targetEntity = requireEntity(entities, Number(targetName.replace('Crate ', '')) - 1);
        release(pointInRow(target, 0.85));

        await expect.poll(() => dropLine()).toBeNull();
        expect(rowIndexOf(session, dragged)).toBe(rowIndexOf(session, targetEntity) + 1);
        expect(session.openLevel.history.undoLabel).toBe('Move Crate 10000');

        session.openLevel.editor.undo();
        expect(rowIndexOf(session, dragged)).toBe(startIndex);
    });

    test('a refused place draws no line, and a drop there makes no step', async () => {
        const { level } = buildLevel(3);
        const session = showPanel(level);

        const crate = await rowShown('Crate 1');
        startDrag(crate);

        moveTo(pointInRow(rowAtListTop(), 0.9));
        await expect.poll(() => dropLine()).not.toBeNull();

        moveTo(pointInRow(await rowShown('World'), 0.1));
        await expect.poll(() => dropLine()).toBeNull();

        moveTo(pointInRow(crate, 0.9));
        await expect.poll(() => dropLine()).not.toBeNull();
        moveTo(pointInRow(crate, 0.5));
        await expect.poll(() => dropLine()).toBeNull();

        release(pointInRow(crate, 0.5));
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });

    test('dragging a selected row drags the whole selection, and the drop is one undo step', async () => {
        const { level, entities } = buildLevel(4);
        const session = showPanel(level);
        const crate1 = requireEntity(entities, 0);
        const crate3 = requireEntity(entities, 2);
        const crate4 = requireEntity(entities, 3);
        session.openLevel.selection.replace([crate4.id, crate3.id]);

        startDrag(await rowShown('Crate 3'));
        const lastRow = await rowShown('Crate 1');
        moveTo(pointInRow(lastRow, 0.9));
        await expect.poll(() => dropLine()).not.toBeNull();
        release(pointInRow(lastRow, 0.9));
        // The browser's click after the release must not select the row under it.
        click(lastRow);

        const crate1Index = rowIndexOf(session, crate1);
        expect(rowIndexOf(session, crate4)).toBe(crate1Index + 1);
        expect(rowIndexOf(session, crate3)).toBe(crate1Index + 2);
        expect(session.openLevel.selection.ids).toEqual(expect.arrayContaining([crate3.id, crate4.id]));
        expect(session.openLevel.history.undoLabel).toBe('Move 2 entities');

        session.openLevel.editor.undo();
        expect(rowIndexOf(session, crate4)).toBeLessThan(rowIndexOf(session, crate1));
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });

    test('dragging a row that is not selected selects it alone, and Esc cancels the drag', async () => {
        const { level, entities } = buildLevel(3);
        const session = showPanel(level);
        const crate1 = requireEntity(entities, 0);
        const crate2 = requireEntity(entities, 1);
        session.openLevel.selection.replace([crate1.id]);

        startDrag(await rowShown('Crate 2'));
        expect(session.openLevel.selection.ids).toEqual([crate2.id]);

        const lastRow = await rowShown('Crate 1');
        moveTo(pointInRow(lastRow, 0.9));
        await expect.poll(() => dropLine()).not.toBeNull();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        await expect.poll(() => dropLine()).toBeNull();

        release(pointInRow(lastRow, 0.9));
        click(lastRow);
        expect(session.openLevel.history.undoLabel).toBeUndefined();
        expect(session.openLevel.selection.ids).toEqual([crate2.id]);
    });

    test('a change to the tree during a drag, such as Ctrl+Z, ends the drag', async () => {
        const { level } = buildLevel(3);
        const session = showPanel(level);

        startDrag(await rowShown('Crate 2'));
        const lastRow = await rowShown('Crate 1');
        moveTo(pointInRow(lastRow, 0.9));
        await expect.poll(() => dropLine()).not.toBeNull();

        addNamedEntity(level, 'Barrel');
        await expect.poll(() => dropLine()).toBeNull();

        release(pointInRow(lastRow, 0.9));
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });
});

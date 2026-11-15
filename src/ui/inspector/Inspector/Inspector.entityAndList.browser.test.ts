import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { CameraComponent, ShapeComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import { DeleteCommand } from '../../../editor/commands/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addBareEntity,
    addCrate,
    closeInspectorPage,
    inspectorContainer,
    openInspectorPage,
    requireCard,
    requireElement,
    select,
    showInspector,
} from './testing/inspectorPage.ts';

beforeEach(() => {
    openInspectorPage();
});

afterEach(() => {
    closeInspectorPage();
});

const SQUARE: readonly Point[] = [
    { x: -50, y: -50 },
    { x: 50, y: -50 },
    { x: 50, y: 50 },
    { x: -50, y: 50 },
];

function fieldRow(typeName: string, key: string) {
    return requireElement<HTMLElement>(requireCard(typeName), `.card-field[data-key="${key}"]`);
}

function followField() {
    return requireElement<HTMLElement>(fieldRow('CameraComponent', 'follow'), '.entity-field');
}

function followText() {
    return followField().querySelector('.chosen')?.textContent;
}

function followOf(level: Level) {
    return level.camera.requireComponent(CameraComponent).get('follow');
}

function undoCount(session: EditorSession) {
    return session.openLevel.history.undoCount;
}

function middleOf(element: Element) {
    const box = element.getBoundingClientRect();

    return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

function pointer(type: string, target: EventTarget, point: { x: number; y: number }) {
    const init = { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, button: 0, isPrimary: true };
    target.dispatchEvent(new PointerEvent(type, init));
}

async function panelRow(name: string) {
    const findRow = () => {
        const rows = inspectorContainer().querySelectorAll<HTMLElement>('[role="treeitem"]');

        return [...rows].find((row) => row.querySelector('.name')?.textContent === name);
    };
    await expect.poll(findRow).toBeDefined();

    const row = findRow();
    if (row === undefined) throw new Error(`No row named ${name}.`);

    return row;
}

// Presses on the row's name, moves past the 3 px start, then over the place and lets go there.
async function dragRowOnto(rowName: string, place: Element) {
    const row = await panelRow(rowName);
    const name = requireElement<HTMLElement>(row, '.name');
    place.scrollIntoView({ block: 'center' });
    const start = middleOf(name);
    const end = middleOf(place);

    pointer('pointerdown', name, start);
    pointer('pointermove', document, { x: start.x, y: start.y + 5 });
    pointer('pointermove', document, end);
    pointer('pointerup', document, end);
}

async function showCameraWithPlayer() {
    const level = Level.createNew();
    const player = addBareEntity(level, 'Player');
    const shown = showInspector(level, true);
    select(shown.session, [level.camera]);
    await expect.poll(() => followText()).toBe('None');

    return { level, player, ...shown };
}

describe('the entity field', () => {
    test("dropping a row onto the camera's Follow sets it in one step, and the camera stays selected", async () => {
        const { level, player, session } = await showCameraWithPlayer();

        await dragRowOnto('Player', followField());

        expect(followOf(level)).toBe(player.id);
        expect(undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Follow');
        expect(session.openLevel.selection.ids).toEqual([level.camera.id]);
        await expect.poll(() => followText()).toBe('Player');
    });

    test("dropping the camera's own row is refused with a status text and no step", async () => {
        const { level, session } = await showCameraWithPlayer();

        await dragRowOnto('Camera', followField());

        expect(followOf(level)).toBeNull();
        expect(undoCount(session)).toBe(0);
        expect(session.status.current).toBe("The camera can't be picked");
    });

    test('the dropdown lists the entities but the World and the camera, and a pick is one step', async () => {
        const { level, player, session } = await showCameraWithPlayer();
        addBareEntity(level, 'Crate');

        await userEvent.click(requireElement(followField(), 'button'));
        const entries = () => [...document.querySelectorAll('.menu [role="menuitemcheckbox"], .menu button')];
        await expect.poll(() => entries().length).toBeGreaterThan(0);
        const labels = entries().map((entry) => entry.textContent.trim());
        expect(labels).toEqual(['None', 'Crate', 'Player']);

        const search = requireElement<HTMLInputElement>(document, 'input[aria-label="Search entities"]');
        await userEvent.fill(search, 'play');
        await userEvent.keyboard('{Enter}');

        expect(followOf(level)).toBe(player.id);
        expect(undoCount(session)).toBe(1);
    });

    test('a deleted target shows `missing entity`, and undo brings its name back', async () => {
        const { level, player, session, frames } = await showCameraWithPlayer();
        level.camera.requireComponent(CameraComponent).set('follow', player.id);
        await expect.poll(() => followText()).toBe('Player');

        select(session, [player]);
        new DeleteCommand(session).run();
        select(session, [level.camera]);
        frames.runFrame();

        await expect.poll(() => followText()).toBe('missing entity');
        expect(followField().dataset['shown']).toBe('missing');

        // Undo gives back the selection from before the delete, so the camera is selected again.
        session.openLevel.editor.undo();
        select(session, [level.camera]);
        frames.runFrame();
        await expect.poll(() => followText()).toBe('Player');
    });
});

describe('the list field', () => {
    async function showPolygon() {
        const level = Level.createNew();
        const polygon = addCrate(level, 'Polygon');
        const square = SQUARE.map((point) => ({ ...point }));
        polygon.requireComponent(ShapeComponent).set('geometry', { kind: 'polygon', points: square });
        const shown = showInspector(level);
        select(shown.session, [polygon]);

        const points = () => fieldRow('ShapeComponent', 'points');
        await expect.poll(() => points().querySelector('.count')?.textContent).toBe('4 items');

        return { level, points, ...shown };
    }

    function polygonPoints(level: Level) {
        const entities = [...level.entitiesInPanelOrder()];
        const entity = entities.find(
            (candidate) => candidate !== level.world && candidate.hasComponent(ShapeComponent),
        );
        const geometry = entity?.requireComponent(ShapeComponent).get('geometry');
        if (geometry?.kind !== 'polygon') throw new Error('The level has its polygon.');

        return geometry.points;
    }

    test("a polygon's Points is folded with its count, and unfolds to a row per point", async () => {
        const { points } = await showPolygon();
        expect(points().querySelectorAll('.list-field-row')).toHaveLength(0);

        await userEvent.click(requireElement(points(), '.list-field > .fold'));

        await expect.poll(() => points().querySelectorAll('.list-field-row').length).toBe(4);
        const firstX = requireElement<HTMLInputElement>(points(), '.list-field-row[data-index="0"] input');
        expect(firstX.getAttribute('aria-label')).toBe('Points 1 X');
    });

    test('+ adds a copy of the last point and a row removes its point, each one step', async () => {
        const { level, points, session } = await showPolygon();
        await userEvent.click(requireElement(points(), '.list-field > .fold'));

        await userEvent.click(requireElement(points(), 'button[aria-label="Add to Points"]'));
        expect(polygonPoints(level)).toHaveLength(5);
        expect(polygonPoints(level)[4]).toEqual({ x: -50, y: 50 });
        expect(undoCount(session)).toBe(1);

        await expect.poll(() => points().querySelectorAll('.list-field-row').length).toBe(5);
        await userEvent.click(requireElement(points(), 'button[aria-label="Remove Points 1"]'));
        expect(polygonPoints(level)).toHaveLength(4);
        expect(polygonPoints(level)[0]).toEqual({ x: 50, y: -50 });
        expect(undoCount(session)).toBe(2);
    });

    test('removing a point of a 3-point polygon is refused with its limit as status text', async () => {
        const { level, points, session } = await showPolygon();
        await userEvent.click(requireElement(points(), '.list-field > .fold'));
        await userEvent.click(requireElement(points(), 'button[aria-label="Remove Points 4"]'));
        await expect.poll(() => points().querySelectorAll('.list-field-row').length).toBe(3);

        await userEvent.click(requireElement(points(), 'button[aria-label="Remove Points 1"]'));

        expect(polygonPoints(level)).toHaveLength(3);
        expect(undoCount(session)).toBe(1);
        expect(session.status.current).toBe('Points needs at least 3');
    });

    test("typing a point's x moves only that point", async () => {
        const { level, points } = await showPolygon();
        await userEvent.click(requireElement(points(), '.list-field > .fold'));
        const secondX = requireElement<HTMLInputElement>(points(), '.list-field-row[data-index="1"] input');

        await userEvent.click(secondX);
        await userEvent.fill(secondX, '80');
        await userEvent.keyboard('{Enter}');

        expect(polygonPoints(level)[1]).toEqual({ x: 80, y: -50 });
        expect(polygonPoints(level)[0]).toEqual({ x: -50, y: -50 });
    });
});

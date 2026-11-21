import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { JointComponent, NameComponent, PathComponent, TransformComponent } from '../../../core/components/index.ts';
import type { PathPoint } from '../../../core/geometry/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import {
    addCrate,
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireCard,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

function sharp(x: number, y: number): PathPoint {
    return { x, y, handleIn: null, handleOut: null, corner: 'sharp' };
}

function addPath(level: Level, closed: boolean, points: PathPoint[]) {
    const path = level.createEntity(level.world, 0);
    path.addComponent(new TransformComponent());
    path.addComponent(new NameComponent({ name: 'Path 1' }));
    path.addComponent(new PathComponent({ path: { closed, points } }));

    return path;
}

async function showPath(closed: boolean, points: PathPoint[]) {
    const level = Level.createNew();
    const path = addPath(level, closed, points);
    const { session } = showEntityInspector(level);
    select(session, [path]);
    await expect.poll(() => entityInspectorContainer().querySelector('.path-points-field')).not.toBeNull();

    return { level, path, session };
}

function pointsRow() {
    return requireElement<HTMLElement>(requireCard('PathComponent'), '.card-field[data-key="points"]');
}

function rows() {
    return [...pointsRow().querySelectorAll<HTMLElement>('.path-point-row')];
}

function rowAt(index: number) {
    return requireElement<HTMLElement>(pointsRow(), `.path-point-row[data-index="${index}"]`);
}

function pointsOf(path: Entity) {
    return path.requireComponent(PathComponent).get('path').points;
}

function menuEntryNamed(label: string) {
    const entries = document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]');

    return [...entries].find((entry) => entry.textContent.trim() === label);
}

async function chooseCorner(index: number, label: string) {
    await userEvent.click(requireElement<HTMLButtonElement>(rowAt(index), '.corner button'));
    await expect.poll(() => menuEntryNamed(label)).toBeDefined();
    await userEvent.click(menuEntryNamed(label) as HTMLElement);
}

describe('Entity inspector: a path’s Points', () => {
    test('shows a row per point with its number, position and corner, and a sharp point has no fold arrow', async () => {
        await showPath(false, [sharp(0, 0), sharp(50, 10), sharp(100, 0)]);

        expect(rows()).toHaveLength(3);
        const numbers = rows().map((row) => row.querySelector('.number')?.textContent);
        expect(numbers).toEqual(['1', '2', '3']);
        const x = requireElement<HTMLInputElement>(rowAt(1), '.vector-axis-box[data-axis="x"] input');
        const y = requireElement<HTMLInputElement>(rowAt(1), '.vector-axis-box[data-axis="y"] input');
        expect([x.value, y.value]).toEqual(['50', '10']);
        expect(requireElement<HTMLButtonElement>(rowAt(1), '.corner button').textContent).toBe('Sharp');
        expect(rowAt(1).querySelector('.fold')).toBeNull();
    });

    test('a typed position is one step', async () => {
        const { path, session } = await showPath(false, [sharp(0, 0), sharp(50, 10)]);
        const x = requireElement<HTMLInputElement>(rowAt(1), '.vector-axis-box[data-axis="x"] input');

        await userEvent.click(x);
        await userEvent.fill(x, '70');
        await userEvent.keyboard('{Enter}');

        await expect.poll(() => pointsOf(path)[1]).toEqual(sharp(70, 10));
        expect(session.openLevel.history.undoCount).toBe(1);
    });

    test('choosing Smooth gives handles, unfolded under the row, with None for a missing end handle', async () => {
        const { path } = await showPath(false, [sharp(0, 0), sharp(30, 60)]);

        await chooseCorner(1, 'Smooth');
        await expect.poll(() => pointsOf(path)[1]?.corner).toBe('smooth');
        expect(pointsOf(path)[1]?.handleIn).toEqual({ x: -10, y: -20 });

        const fold = requireElement<HTMLButtonElement>(rowAt(1), '.fold');
        expect(fold.getAttribute('aria-expanded')).toBe('false');
        await userEvent.click(fold);

        const labels = [...rowAt(1).querySelectorAll('.path-handle-row .label')].map((label) => label.textContent);
        expect(labels).toEqual(['Handle in', 'Handle out']);
        const handleRows = rowAt(1).querySelectorAll('.path-handle-row');
        expect(handleRows[1]?.querySelector('.none')?.textContent).toBe('None');
        const handleX = requireElement<HTMLInputElement>(handleRows[0] as HTMLElement, '.vector-axis-box input');
        expect(handleX.value).toBe('-10');
    });

    test('choosing Sharp drops the handles and the fold arrow', async () => {
        const curved: PathPoint = {
            x: 30,
            y: 0,
            handleIn: { x: -10, y: 0 },
            handleOut: { x: 10, y: 0 },
            corner: 'smooth',
        };
        const { path } = await showPath(false, [sharp(0, 0), curved, sharp(90, 0)]);

        await chooseCorner(1, 'Sharp');

        await expect.poll(() => pointsOf(path)[1]).toEqual(sharp(30, 0));
        await expect.poll(() => rowAt(1).querySelector('.fold')).toBeNull();
    });

    test('over 100 points, only the rows in view are built', async () => {
        const many = Array.from({ length: 500 }, (_item, index) => sharp(index, 0));
        await showPath(false, many);

        await expect.poll(() => pointsRow().querySelector('.virtual-path-point-rows')).not.toBeNull();
        expect(rows().length).toBeGreaterThan(0);
        expect(rows().length).toBeLessThan(100);
        expect(pointsRow().querySelector('.count')?.textContent).toBe('500');
    });

    test('a Rope’s Points are read-only, showing how many there are', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const rope = addPath(level, false, [sharp(0, 0), sharp(100, 0)]);
        rope.addComponent(new JointComponent({ ...JointComponent.schema.defaults(), a: crate.id }));
        const { session } = showEntityInspector(level);
        select(session, [rope]);
        await expect.poll(() => entityInspectorContainer().querySelector('[data-key="points"]')).not.toBeNull();

        expect(pointsRow().querySelector('.path-points-field')).toBeNull();
        expect(pointsRow().textContent).toContain('2');
    });
});

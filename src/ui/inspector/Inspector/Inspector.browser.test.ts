import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { labelName, Level } from '../../../core/level/index.ts';
import {
    addBareEntity,
    addCrate,
    buttonNamed,
    cardOf,
    click,
    closeInspectorPage,
    hover,
    inspectorContainer,
    openInspectorPage,
    requireCard,
    requireElement,
    select,
    showInspector,
    shownCardTypes,
    type,
} from './testing/inspectorPage.ts';

// The tooltip waits half a second before it shows.
const TOOLTIP_WAIT = { timeout: 2000 };

beforeEach(openInspectorPage);
afterEach(closeInspectorPage);

function headTitle() {
    const head = requireElement(inspectorContainer(), '.inspector-head');
    const box = head.querySelector<HTMLInputElement>('input');
    if (box !== null) return box.value;

    return head.querySelector('.title')?.textContent;
}

function isFolded(typeName: string) {
    const title = requireElement(requireCard(typeName), '.title');

    return title.getAttribute('aria-expanded') === 'false';
}

function menuRows() {
    return [...inspectorContainer().querySelectorAll<HTMLElement>('[role="menuitem"]')];
}

function menuRowNamed(label: string) {
    const row = menuRows().find((candidate) => candidate.textContent.trim() === label);
    if (row === undefined) throw new Error(`No menu entry reads ${label}.`);

    return row;
}

async function shownMenuRow(label: string) {
    await expect.poll(() => menuLabels()).toContain(label);

    return menuRowNamed(label);
}

function menuLabels() {
    return menuRows().map((row) => row.textContent.trim());
}

function shownTooltip() {
    return inspectorContainer().querySelector('[role="tooltip"]')?.textContent;
}

function notesOf(typeName: string) {
    const notes = cardOf(typeName)?.querySelectorAll('[role="note"]') ?? [];

    return [...notes].map((note) => note.textContent);
}

function press(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('Inspector', () => {
    test("with nothing selected it shows the World's cards, without its TransformComponent", async () => {
        const level = Level.createNew();
        showInspector(level);

        await expect.poll(() => headTitle()).toBe('World');

        const types = shownCardTypes();
        expect(types).toEqual(expect.arrayContaining(['ShapeComponent', 'StyleComponent', 'PhysicsWorldComponent']));
        expect(types).not.toContain('TransformComponent');
        expect(inspectorContainer().querySelector('.inspector-head input')).toBeNull();
        expect(inspectorContainer().querySelector('.inspector-head button')).toBeNull();
    });

    test('a fold is kept per component type, on every entity', async () => {
        const level = Level.createNew();
        const first = addCrate(level, 'First');
        const second = addCrate(level, 'Second');
        const { session } = showInspector(level);

        select(session, [first]);
        await expect.poll(() => headTitle()).toBe('First');
        click(requireElement(requireCard('BodyComponent'), '.title'));

        await expect.poll(() => isFolded('BodyComponent')).toBe(true);
        expect(requireCard('BodyComponent').querySelector('.card-field')).toBeNull();

        select(session, [second]);
        await expect.poll(() => headTitle()).toBe('Second');

        expect(isFolded('BodyComponent')).toBe(true);
        expect(isFolded('ShapeComponent')).toBe(false);
    });

    test('Add Component lists what is missing, with greyed entries and their reasons', async () => {
        const level = Level.createNew();
        const entity = addBareEntity(level, 'Empty');
        const { session } = showInspector(level);
        select(session, [entity]);
        await expect.poll(() => headTitle()).toBe('Empty');

        click(buttonNamed(inspectorContainer(), 'Add Component'));
        await expect.poll(() => menuRows().length).toBeGreaterThan(0);

        const labels = menuLabels();
        expect(labels).toEqual(expect.arrayContaining(['ShapeComponent', 'BodyComponent', 'SurfaceComponent']));
        expect(labels).not.toContain('TransformComponent');
        expect(labels).not.toContain('NameComponent');

        const jointEntry = menuRowNamed('JointComponent');
        expect(jointEntry.getAttribute('aria-disabled')).toBe('true');
        hover(jointEntry);
        await expect.poll(() => shownTooltip(), TOOLTIP_WAIT).toBe('Use the Joint tool to place a joint.');

        const search = requireElement<HTMLInputElement>(inspectorContainer(), 'input[aria-label="Search components"]');
        type(search, 'body');
        await expect.poll(() => menuLabels()).toEqual(['BodyComponent']);

        press(search, 'Enter');
        await expect.poll(() => shownCardTypes()).toContain('BodyComponent');
        expect(menuRows()).toHaveLength(0);
        expect(session.openLevel.history.undoLabel).toBe('Add BodyComponent');
    });

    test("Remove leaves the partner's note, and its link adds the partner back", async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session, frames } = showInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const shapeMenu = requireElement(requireCard('ShapeComponent'), 'button[aria-label="ShapeComponent menu"]');
        click(shapeMenu);
        click(await shownMenuRow('Remove'));
        frames.runFrame();

        await expect.poll(() => shownCardTypes()).not.toContain('ShapeComponent');
        await expect.poll(() => notesOf('SurfaceComponent').join(' ')).toContain('Needs a ShapeComponent');

        click(buttonNamed(requireCard('SurfaceComponent'), 'Add ShapeComponent'));
        frames.runFrame();

        await expect.poll(() => shownCardTypes()).toContain('ShapeComponent');
        await expect.poll(() => notesOf('SurfaceComponent')).toEqual([]);
        expect(session.openLevel.history.undoLabel).toBe('Add ShapeComponent');
    });

    test('Remove on the World is greyed with its reason', async () => {
        const level = Level.createNew();
        showInspector(level);
        await expect.poll(() => headTitle()).toBe('World');

        const worldMenu = requireElement(
            requireCard('PhysicsWorldComponent'),
            'button[aria-label="PhysicsWorldComponent menu"]',
        );
        click(worldMenu);

        const remove = await shownMenuRow('Remove');
        expect(remove.getAttribute('aria-disabled')).toBe('true');
        hover(remove);
        await expect.poll(() => shownTooltip(), TOOLTIP_WAIT).toBe('The World needs it');
    });

    test("the header's name box renames the entity in one step, and Esc keeps the old name", async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session } = showInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const box = requireElement<HTMLInputElement>(inspectorContainer(), '.inspector-head input');
        box.focus();
        type(box, 'Barrel');
        press(box, 'Enter');

        await expect.poll(() => labelName(crate)).toBe('Barrel');
        expect(session.openLevel.history.undoLabel).toBe('Rename Crate');

        const renamedBox = requireElement<HTMLInputElement>(inspectorContainer(), '.inspector-head input');
        renamedBox.focus();
        type(renamedBox, 'Box');
        press(renamedBox, 'Escape');

        await expect.poll(() => headTitle()).toBe('Barrel');
        expect(labelName(crate)).toBe('Barrel');
    });

    test('after New then Import it follows the imported level, whose model starts at the same version', async () => {
        const { session } = showInspector(Level.createNew());
        await expect.poll(() => headTitle()).toBe('World');

        session.replaceOpenLevel(Level.createNew());
        const imported = Level.createNew();
        const crate = addCrate(imported, 'Crate');
        session.replaceOpenLevel(imported);
        await expect.poll(() => headTitle()).toBe('World');

        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');
        expect(shownCardTypes()).toContain('BodyComponent');
    });
});

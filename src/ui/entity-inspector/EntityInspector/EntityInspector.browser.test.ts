import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { JointComponent, SurfaceComponent } from '../../../core/components/index.ts';
import { labelName, Level } from '../../../core/level/index.ts';
import {
    addBareEntity,
    addCrate,
    buttonNamed,
    cardOf,
    click,
    closeEntityInspectorPage,
    hover,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireCard,
    requireElement,
    select,
    showEntityInspector,
    shownCardTypes,
    type,
} from './testing/entityInspectorPage.ts';

// The tooltip waits half a second before it shows.
const TOOLTIP_WAIT = { timeout: 2000 };

beforeEach(async () => {
    openEntityInspectorPage();
    await parkRealMouse();
});
afterEach(closeEntityInspectorPage);

function headTitle() {
    const head = requireElement(entityInspectorContainer(), '.entity-inspector-head');
    const box = head.querySelector<HTMLInputElement>('input');
    if (box !== null) return box.value;

    return head.querySelector('.title')?.textContent;
}

function isFolded(typeName: string) {
    const title = requireElement(requireCard(typeName), '.title');

    return title.getAttribute('aria-expanded') === 'false';
}

function menuRows() {
    return [...entityInspectorContainer().querySelectorAll<HTMLElement>('[role="menuitem"]')];
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
    return entityInspectorContainer().querySelector('[role="tooltip"]')?.textContent;
}

function notesOf(typeName: string) {
    const notes = cardOf(typeName)?.querySelectorAll('[role="note"]') ?? [];

    return [...notes].map((note) => note.textContent);
}

// A token as the browser writes the colour, to compare with a computed style.
function themeColour(token: string) {
    const probe = document.createElement('div');
    probe.style.color = `var(${token})`;
    entityInspectorContainer().append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();

    return colour;
}

function press(element: Element, key: string) {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

// Browser test files share one page, so the real mouse rests where another file's last click left it. Over
// the Entity inspector's place it would hover a field, whose tooltip a test would read as its own.
async function parkRealMouse() {
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
}

describe('Entity inspector', () => {
    test("with nothing selected it shows the World's cards, without its TransformComponent", async () => {
        const level = Level.createNew();
        showEntityInspector(level);

        await expect.poll(() => headTitle()).toBe('World');

        const types = shownCardTypes();
        expect(types).toEqual(expect.arrayContaining(['ShapeComponent', 'StyleComponent', 'PhysicsWorldComponent']));
        expect(types).not.toContain('TransformComponent');
        expect(entityInspectorContainer().querySelector('.entity-inspector-head input')).toBeNull();
        expect(entityInspectorContainer().querySelector('.entity-inspector-head button')).toBeNull();
    });

    test('the panel is titled Entity inspector, in the plain title size', async () => {
        showEntityInspector(Level.createNew());
        await expect.poll(() => headTitle()).toBe('World');

        const title = requireElement(entityInspectorContainer(), '.panel-title');

        expect(title.textContent).toBe('Entity inspector');
        expect(getComputedStyle(title).fontSize).toBe('14px');
        expect(getComputedStyle(title).textTransform).toBe('none');
    });

    test('the name is a pill field of medium weight', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const box = requireElement(entityInspectorContainer(), '.entity-inspector-head input');
        const style = getComputedStyle(box);

        expect(style.borderTopLeftRadius).toBe('14px');
        expect(style.fontWeight).toBe('500');
    });

    test('a card reads its title without Component, in small capitals, and its menu is named the same', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const card = requireCard('BodyComponent');
        const name = requireElement(card, '.title .name');
        const style = getComputedStyle(name);

        expect(name.textContent).toBe('Body');
        expect(style.textTransform).toBe('uppercase');
        expect(style.fontSize).toBe('10px');
        expect(card.querySelector('button[aria-label="Body menu"]')).not.toBeNull();
    });

    test('cards are split by space only', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const style = getComputedStyle(requireCard('BodyComponent'));

        expect(style.borderBottomStyle).toBe('none');
        expect(style.paddingBottom).toBe('10px');
    });

    test('a warning note is tinted at 10% and its fix is in the accent text colour', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        crate.removeComponent(SurfaceComponent);
        const { session, frames } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');
        frames.runFrame();
        await expect.poll(() => notesOf('BodyComponent')).toEqual(['Needs a Surface to collide. Add Surface']);

        const note = requireElement(requireCard('BodyComponent'), '[role="note"]');
        const accentText = themeColour('--accent-text');

        expect(getComputedStyle(note).backgroundColor).toMatch(/[/,] 0\.1\)$/);
        expect(getComputedStyle(requireElement(note, '.fix')).color).toBe(accentText);
    });

    test('Add Component is a raised button across the panel', async () => {
        showEntityInspector(Level.createNew());
        await expect.poll(() => headTitle()).toBe('World');

        const button = requireElement(entityInspectorContainer(), '.add-component .open');
        const raised = themeColour('--raised');

        expect(getComputedStyle(button).backgroundColor).toBe(raised);
    });

    test('a fold is kept per component type, on every entity', async () => {
        const level = Level.createNew();
        const first = addCrate(level, 'First');
        const second = addCrate(level, 'Second');
        const { session } = showEntityInspector(level);

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
        const { session } = showEntityInspector(level);
        select(session, [entity]);
        await expect.poll(() => headTitle()).toBe('Empty');

        click(buttonNamed(entityInspectorContainer(), 'Add Component'));
        await expect.poll(() => menuRows().length).toBeGreaterThan(0);

        const labels = menuLabels();
        expect(labels).toEqual(expect.arrayContaining(['ShapeComponent', 'BodyComponent', 'SurfaceComponent']));
        expect(labels).not.toContain('TransformComponent');
        expect(labels).not.toContain('NameComponent');

        const jointEntry = menuRowNamed('JointComponent');
        expect(jointEntry.getAttribute('aria-disabled')).toBe('true');
        hover(jointEntry);
        await expect.poll(() => shownTooltip(), TOOLTIP_WAIT).toBe('Use the Joint tool to place a joint.');

        const search = requireElement<HTMLInputElement>(
            entityInspectorContainer(),
            'input[aria-label="Search components"]',
        );
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
        const { session, frames } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const shapeMenu = requireElement(requireCard('ShapeComponent'), 'button[aria-label="Shape menu"]');
        click(shapeMenu);
        click(await shownMenuRow('Remove'));
        frames.runFrame();

        await expect.poll(() => shownCardTypes()).not.toContain('ShapeComponent');
        await expect.poll(() => notesOf('SurfaceComponent').join(' ')).toContain('Needs a Shape');

        click(buttonNamed(requireCard('SurfaceComponent'), 'Add Shape'));
        frames.runFrame();

        await expect.poll(() => shownCardTypes()).toContain('ShapeComponent');
        await expect.poll(() => notesOf('SurfaceComponent')).toEqual([]);
        expect(session.openLevel.history.undoLabel).toBe('Add ShapeComponent');
    });

    test('Remove on the World is greyed with its reason', async () => {
        const level = Level.createNew();
        showEntityInspector(level);
        await expect.poll(() => headTitle()).toBe('World');

        const worldMenu = requireElement(
            requireCard('PhysicsWorldComponent'),
            'button[aria-label="PhysicsWorld menu"]',
        );
        click(worldMenu);

        const remove = await shownMenuRow('Remove');
        expect(remove.getAttribute('aria-disabled')).toBe('true');
        hover(remove);
        await expect.poll(() => shownTooltip(), TOOLTIP_WAIT).toBe('The World needs it');
    });

    test('the joint card\'s "Let connected objects collide" has no description, and B still has one', async () => {
        const level = Level.createNew();
        const hinge = addBareEntity(level, 'Hinge 1');
        hinge.addComponent(new JointComponent());
        const { session } = showEntityInspector(level);
        select(session, [hinge]);
        await expect.poll(() => shownCardTypes()).toContain('JointComponent');

        const card = requireCard('JointComponent');
        hover(requireElement(card, '[data-key="letConnectedObjectsCollide"] .label'));
        await new Promise((resolve) => setTimeout(resolve, 800));
        expect(shownTooltip()).toBeUndefined();

        hover(requireElement(card, '[data-key="b"] .label'));
        await expect
            .poll(() => shownTooltip(), TOOLTIP_WAIT)
            .toBe('The second entity. Empty pins A to the background.');
    });

    test("the header's name box renames the entity in one step, and Esc keeps the old name", async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect.poll(() => headTitle()).toBe('Crate');

        const box = requireElement<HTMLInputElement>(entityInspectorContainer(), '.entity-inspector-head input');
        box.focus();
        type(box, 'Barrel');
        press(box, 'Enter');

        await expect.poll(() => labelName(crate)).toBe('Barrel');
        expect(session.openLevel.history.undoLabel).toBe('Rename Crate');

        const renamedBox = requireElement<HTMLInputElement>(entityInspectorContainer(), '.entity-inspector-head input');
        renamedBox.focus();
        type(renamedBox, 'Box');
        press(renamedBox, 'Escape');

        await expect.poll(() => headTitle()).toBe('Barrel');
        expect(labelName(crate)).toBe('Barrel');
    });

    test('after New then Import it follows the imported level, whose model starts at the same version', async () => {
        const { session } = showEntityInspector(Level.createNew());
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

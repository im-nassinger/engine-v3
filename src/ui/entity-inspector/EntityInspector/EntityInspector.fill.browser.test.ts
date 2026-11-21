import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { StyleComponent } from '../../../core/components/index.ts';
import { colourAt } from '../../../core/fields/index.ts';
import type { Fill } from '../../../core/fields/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addCrate,
    click,
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireCard,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';

const BLUE = '#4A90D9FF';
const RED = '#FF0000FF';
const GREEN = '#00FF00FF';

const linear: Fill = {
    kind: 'linear',
    stops: [
        { colour: RED, place: 0 },
        { colour: GREEN, place: 1 },
    ],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
};

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

function fillRow() {
    return requireElement<HTMLElement>(requireCard('StyleComponent'), '.card-field[data-key="fill"]');
}

function kindButton() {
    return requireElement<HTMLButtonElement>(fillRow(), '.choice-field button');
}

function gradientRow(label: string) {
    const rows = [...fillRow().querySelectorAll<HTMLElement>('.gradient-row')];
    const row = rows.find((candidate) => candidate.querySelector('.label')?.textContent === label);
    if (row === undefined) throw new Error(`No gradient row ${label}.`);

    return row;
}

function gradientLabels() {
    const labels = [...fillRow().querySelectorAll('.gradient-row > .label')];

    return labels.map((label) => label.textContent);
}

function stopSwatches() {
    return [...fillRow().querySelectorAll<HTMLButtonElement>('.stop-swatches .stop')];
}

function rowInput(label: string) {
    return requireElement<HTMLInputElement>(gradientRow(label), 'input:not([type])');
}

function axisInput(label: string, axis: 'x' | 'y') {
    return requireElement<HTMLInputElement>(gradientRow(label), `.vector-axis-box[data-axis="${axis}"] input`);
}

function fillOf(entity: Entity) {
    return entity.requireComponent(StyleComponent).get('fill');
}

function undoCount(session: EditorSession) {
    return session.openLevel.history.undoCount;
}

async function showCrates(fills: readonly Fill[]) {
    const level = Level.createNew();
    const crates = fills.map((fill, index) => {
        const crate = addCrate(level, `Crate ${index}`);
        crate.addComponent(new StyleComponent({ ...StyleComponent.schema.defaults(), fill }));
        return crate;
    });

    const { session } = showEntityInspector(level);
    select(session, crates);
    await expect.poll(() => entityInspectorContainer().querySelector('.card-field[data-key="fill"]')).not.toBeNull();

    return { crates, session };
}

async function chooseKind(label: string) {
    await userEvent.click(kindButton());
    await expect.poll(() => menuEntryNamed(label)).toBeDefined();
    const entry = menuEntryNamed(label);
    if (entry === undefined) throw new Error(`No ${label} entry.`);

    await userEvent.click(entry);
}

function menuEntryNamed(label: string) {
    const entries = document.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]');

    return [...entries].find((entry) => entry.textContent.trim() === label);
}

// A pointer on the element, at this share of its width from the left.
function pointerAt(element: HTMLElement, share: number) {
    const { left, top, width, height } = element.getBoundingClientRect();

    return { clientX: left + share * width, clientY: top + height / 2, bubbles: true, button: 0, isPrimary: true };
}

function clickBarAt(share: number) {
    const bar = requireElement<HTMLElement>(fillRow(), '.gradient-bar');
    const pointer = pointerAt(bar, share);
    bar.dispatchEvent(new MouseEvent('click', pointer));
}

// Presses the stop and drags it to this share of the swatches' row, without letting go.
function dragStop(index: number, share: number) {
    const swatch = stopSwatches()[index] as HTMLButtonElement;
    const row = requireElement<HTMLElement>(fillRow(), '.stop-swatches');
    const swatchBox = swatch.getBoundingClientRect();
    const pressX = swatchBox.left + swatchBox.width / 2;
    swatch.dispatchEvent(new PointerEvent('pointerdown', { ...pointerAt(row, 0), clientX: pressX }));
    window.dispatchEvent(new PointerEvent('pointermove', pointerAt(row, share)));
}

function letGo() {
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
}

function chosenStops() {
    return stopSwatches().map((stop) => stop.getAttribute('aria-pressed'));
}

async function typeInto(box: HTMLInputElement, text: string) {
    await userEvent.click(box);
    await userEvent.fill(box, text);
    await userEvent.keyboard('{Enter}');
}

describe('Entity inspector: the Fill', () => {
    test('offers None, Solid, Linear and Radial, and Solid shows its colour field', async () => {
        await showCrates([{ kind: 'solid', colour: BLUE }]);
        expect(kindButton().textContent).toBe('Solid');

        await userEvent.click(kindButton());
        await expect.poll(() => menuEntryNamed('Radial')).toBeDefined();
        const labels = ['None', 'Solid', 'Linear', 'Radial'].map((label) => menuEntryNamed(label)?.textContent.trim());
        expect(labels).toEqual(['None', 'Solid', 'Linear', 'Radial']);
        await userEvent.keyboard('{Escape}');

        const code = requireElement<HTMLInputElement>(fillRow(), '.colour-box input:not([type])');
        expect(code.value).toBe(BLUE);
        expect(fillRow().querySelector('.gradient-editor')).toBeNull();
    });

    test('a colour typed into Solid is one step', async () => {
        const { crates, session } = await showCrates([{ kind: 'solid', colour: BLUE }]);
        const code = requireElement<HTMLInputElement>(fillRow(), '.colour-box input:not([type])');

        await typeInto(code, '123456');

        await expect.poll(() => fillOf(crates[0] as Entity)).toEqual({ kind: 'solid', colour: '#123456FF' });
        expect(undoCount(session)).toBe(1);
    });

    test('None shows no colour field and no gradient editor, and Solid comes back with the default colour', async () => {
        const { crates, session } = await showCrates([{ kind: 'none' }]);
        expect(kindButton().textContent).toBe('None');
        expect(fillRow().querySelector('.colour-box')).toBeNull();
        expect(fillRow().querySelector('.gradient-editor')).toBeNull();

        await chooseKind('Solid');

        await expect.poll(() => fillOf(crates[0] as Entity)).toEqual({ kind: 'solid', colour: BLUE });
        expect(undoCount(session)).toBe(1);
    });

    test('Solid to Linear is one step and shows the gradient editor', async () => {
        const { crates, session } = await showCrates([{ kind: 'solid', colour: RED }]);

        await chooseKind('Linear');

        await expect.poll(() => fillOf(crates[0] as Entity).kind).toBe('linear');
        expect(fillOf(crates[0] as Entity)).toEqual({
            kind: 'linear',
            stops: [
                { colour: RED, place: 0 },
                { colour: '#FF000000', place: 1 },
            ],
            start: { x: 0, y: 0.5 },
            end: { x: 1, y: 0.5 },
        });
        expect(undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Fill');

        await expect.poll(() => fillRow().querySelector('.gradient-bar')).not.toBeNull();
        expect(gradientLabels()).toEqual(['Colour', 'Place', '', 'Start', 'End']);
        expect(stopSwatches().map((stop) => stop.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
        expect(rowInput('Colour').value).toBe(RED);
        expect(rowInput('Place').value).toBe('0');
        expect(axisInput('Start', 'x').value).toBe('0');
        expect(axisInput('Start', 'y').value).toBe('50');
        expect(axisInput('End', 'x').value).toBe('100');
        const remove = requireElement<HTMLButtonElement>(gradientRow('Colour'), 'button[aria-label="Remove stop"]');
        expect(remove.getAttribute('aria-disabled')).toBe('true');
    });

    test('Radial shows Centre and Radius in %, and a typed radius is one step', async () => {
        const { crates, session } = await showCrates([{ kind: 'solid', colour: RED }]);
        await chooseKind('Radial');
        await expect.poll(() => fillRow().querySelector('.gradient-bar')).not.toBeNull();
        expect(gradientLabels()).toEqual(['Colour', 'Place', '', 'Centre', 'Radius']);
        expect(axisInput('Centre', 'x').value).toBe('50');
        expect(rowInput('Radius').value).toBe('50');

        await typeInto(rowInput('Radius'), '25');

        await expect.poll(() => fillOf(crates[0] as Entity)).toMatchObject({ kind: 'radial', radius: 0.25 });
        expect(undoCount(session)).toBe(2);
    });

    test('a chosen stop shows its Colour and Place, and typing either is one step', async () => {
        const { crates, session } = await showCrates([linear]);
        const crate = crates[0] as Entity;

        await userEvent.click(stopSwatches()[1] as HTMLButtonElement);
        await expect.poll(() => rowInput('Colour').value).toBe(GREEN);
        expect(rowInput('Place').value).toBe('100');

        await typeInto(rowInput('Colour'), '0000FF');
        await expect.poll(() => fillOf(crate)).toMatchObject({ stops: [linear.stops[0], { colour: '#0000FFFF' }] });
        expect(undoCount(session)).toBe(1);

        await typeInto(rowInput('Place'), '30');
        await expect.poll(() => undoCount(session)).toBe(2);
    });

    test('a place typed past another stop re-sorts the stops, and the stop stays chosen', async () => {
        const stops = [
            { colour: RED, place: 0 },
            { colour: GREEN, place: 0.5 },
        ];
        const { crates } = await showCrates([{ ...linear, stops }]);

        await typeInto(rowInput('Place'), '80');

        await expect
            .poll(() => fillOf(crates[0] as Entity))
            .toMatchObject({
                stops: [
                    { colour: GREEN, place: 0.5 },
                    { colour: RED, place: 0.8 },
                ],
            });
        await expect.poll(() => stopSwatches()[1]?.getAttribute('aria-pressed')).toBe('true');
        expect(rowInput('Colour').value).toBe(RED);
    });

    test('+ Add stop adds one in the widest gap and − removes the chosen one, one step each', async () => {
        const { crates, session } = await showCrates([linear]);
        const crate = crates[0] as Entity;
        const addStop = requireElement<HTMLButtonElement>(fillRow(), '.add-stop-button');

        await userEvent.click(addStop);

        await expect.poll(() => stopSwatches().length).toBe(3);
        expect(fillOf(crate)).toMatchObject({
            stops: [linear.stops[0], { colour: '#808000FF', place: 0.5 }, linear.stops[1]],
        });
        expect(stopSwatches()[1]?.getAttribute('aria-pressed')).toBe('true');
        expect(undoCount(session)).toBe(1);

        const remove = requireElement<HTMLButtonElement>(gradientRow('Colour'), 'button[aria-label="Remove stop"]');
        await userEvent.click(remove);

        await expect.poll(() => stopSwatches().length).toBe(2);
        expect(fillOf(crate)).toEqual(linear);
        expect(undoCount(session)).toBe(2);
    });

    test('+ Add stop is disabled with 8 stops', async () => {
        const stops = Array.from({ length: 8 }, (_, index) => ({ colour: RED, place: index / 7 }));
        const { crates, session } = await showCrates([{ ...linear, stops }]);
        const addStop = requireElement<HTMLButtonElement>(fillRow(), '.add-stop-button');
        expect(addStop.getAttribute('aria-disabled')).toBe('true');

        // Playwright won't click a button it reads as disabled, so the click is sent as the browser would.
        click(addStop);

        expect(fillOf(crates[0] as Entity)).toMatchObject({ stops });
        expect(undoCount(session)).toBe(0);
    });

    test('a typed Start is one step, in % of the box', async () => {
        const { crates, session } = await showCrates([linear]);

        await typeInto(axisInput('Start', 'x'), '20');

        await expect.poll(() => fillOf(crates[0] as Entity)).toMatchObject({ start: { x: 0.2, y: 0.5 } });
        expect(undoCount(session)).toBe(1);
    });

    test('different fills show Mixed and no editor; picking a kind switches each from its own fill', async () => {
        const { crates, session } = await showCrates([
            { kind: 'solid', colour: RED },
            { kind: 'solid', colour: GREEN },
        ]);
        expect(kindButton().textContent).toBe('Mixed');
        expect(fillRow().querySelector('.colour-box')).toBeNull();
        expect(fillRow().querySelector('.gradient-editor')).toBeNull();

        await chooseKind('Linear');

        await expect
            .poll(() => fillOf(crates[0] as Entity))
            .toMatchObject({ stops: [{ colour: RED }, { colour: '#FF000000' }] });
        expect(fillOf(crates[1] as Entity)).toMatchObject({ stops: [{ colour: GREEN }, { colour: '#00FF0000' }] });
        expect(undoCount(session)).toBe(1);
    });

    test('equal gradients on several entities show the editor, and an edit changes each', async () => {
        const { crates } = await showCrates([linear, linear]);
        await expect.poll(() => fillRow().querySelector('.gradient-editor')).not.toBeNull();

        await typeInto(axisInput('End', 'y'), '0');

        await expect.poll(() => fillOf(crates[0] as Entity)).toMatchObject({ end: { x: 1, y: 0 } });
        expect(fillOf(crates[1] as Entity)).toMatchObject({ end: { x: 1, y: 0 } });
    });

    test('a click on the bar adds a stop there with the colour already there, chosen, as one step', async () => {
        const { crates, session } = await showCrates([linear]);

        clickBarAt(0.25);

        const added = { colour: colourAt(linear.stops, 0.25), place: 0.25 };
        await expect.poll(() => stopSwatches().length).toBe(3);
        expect(fillOf(crates[0] as Entity)).toMatchObject({ stops: [linear.stops[0], added, linear.stops[1]] });
        expect(chosenStops()).toEqual(['false', 'true', 'false']);
        expect(rowInput('Place').value).toBe('25');
        expect(undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Fill');
    });

    test('a click on the bar adds nothing with 8 stops', async () => {
        const stops = Array.from({ length: 8 }, (_, index) => ({ colour: RED, place: index / 7 }));
        const { crates, session } = await showCrates([{ ...linear, stops }]);

        clickBarAt(0.5);

        expect(fillOf(crates[0] as Entity)).toMatchObject({ stops });
        expect(undoCount(session)).toBe(0);
    });

    test('dragging a stop past another changes the level live, keeps it chosen, and is one step on release', async () => {
        const stops = [
            { colour: RED, place: 0 },
            { colour: GREEN, place: 0.5 },
        ];
        const { crates, session } = await showCrates([{ ...linear, stops }]);
        const crate = crates[0] as Entity;

        dragStop(0, 0.8);

        const moved = [
            { colour: GREEN, place: 0.5 },
            { colour: RED, place: 0.8 },
        ];
        await expect.poll(() => fillOf(crate)).toMatchObject({ stops: moved });
        expect(undoCount(session)).toBe(0);
        await expect.poll(() => chosenStops()).toEqual(['false', 'true']);
        expect(rowInput('Colour').value).toBe(RED);

        letGo();

        await expect.poll(() => undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Fill');
        expect(fillOf(crate)).toMatchObject({ stops: moved });
        expect(chosenStops()).toEqual(['false', 'true']);

        session.openLevel.editor.undo();
        expect(fillOf(crate)).toMatchObject({ stops });
    });

    test("Esc during a stop's drag puts the stops back, the stop chosen where it was, and makes no step", async () => {
        const stops = [
            { colour: RED, place: 0 },
            { colour: GREEN, place: 0.5 },
        ];
        const { crates, session } = await showCrates([{ ...linear, stops }]);

        dragStop(0, 0.8);
        await expect.poll(() => chosenStops()).toEqual(['false', 'true']);

        session.openLevel.liveEdit.cancel();
        letGo();

        await expect.poll(() => chosenStops()).toEqual(['true', 'false']);
        expect(fillOf(crates[0] as Entity)).toMatchObject({ stops });
        expect(rowInput('Colour').value).toBe(RED);
        expect(undoCount(session)).toBe(0);
    });

    test('the Place slider moves the chosen stop live and is one step when let go', async () => {
        const { crates, session } = await showCrates([linear]);
        const crate = crates[0] as Entity;
        const pill = requireElement<HTMLElement>(gradientRow('Place'), '.number-box');

        pill.dispatchEvent(new PointerEvent('pointerdown', pointerAt(pill, 0)));
        window.dispatchEvent(new PointerEvent('pointermove', pointerAt(pill, 0.4)));

        await expect.poll(() => fillOf(crate)).toMatchObject({ stops: [{ colour: RED, place: 0.4 }, linear.stops[1]] });
        expect(undoCount(session)).toBe(0);

        letGo();

        await expect.poll(() => undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Fill');
        expect(chosenStops()).toEqual(['true', 'false']);
    });
});

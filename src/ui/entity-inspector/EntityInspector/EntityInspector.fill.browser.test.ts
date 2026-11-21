import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { StyleComponent } from '../../../core/components/index.ts';
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
});

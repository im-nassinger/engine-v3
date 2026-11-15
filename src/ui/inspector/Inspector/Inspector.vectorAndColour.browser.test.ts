import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addCrate,
    closeInspectorPage,
    inspectorContainer,
    openInspectorPage,
    requireCard,
    requireElement,
    select,
    showInspector,
} from './testing/inspectorPage.ts';

let levelView: HTMLElement;

// The place Enter gives the keyboard back to.
beforeEach(() => {
    openInspectorPage();
    levelView = document.createElement('div');
    levelView.dataset['focusPlace'] = 'level';
    levelView.tabIndex = -1;
    levelView.style.width = '200px';
    levelView.style.height = '100px';
    document.body.append(levelView);
});

afterEach(() => {
    closeInspectorPage();
    levelView.remove();
});

function fieldRow(typeName: string, key: string) {
    return requireElement<HTMLElement>(requireCard(typeName), `.card-field[data-key="${key}"]`);
}

function axisBox(key: string, axis: 'x' | 'y') {
    const row = fieldRow('TransformComponent', key);

    return requireElement<HTMLInputElement>(row, `.vector-axis-box[data-axis="${axis}"] input`);
}

function axisMessage(key: string, axis: 'x' | 'y') {
    const row = fieldRow('TransformComponent', key);
    const box = requireElement<HTMLElement>(row, `.vector-axis-box[data-axis="${axis}"]`);

    return box.querySelector('.field-message')?.textContent;
}

function codeBox(key: string) {
    return requireElement<HTMLInputElement>(fieldRow('StyleComponent', key), '.colour-box input:not([type])');
}

function pickerOf(key: string) {
    return requireElement<HTMLInputElement>(fieldRow('StyleComponent', key), 'input[type="color"]');
}

function styleOf(entity: Entity) {
    return entity.requireComponent(StyleComponent);
}

function transformOf(entity: Entity) {
    return entity.requireComponent(TransformComponent);
}

function undoCount(session: EditorSession) {
    return session.openLevel.history.undoCount;
}

async function showCrates(count: number) {
    const level = Level.createNew();
    const crates: Entity[] = [];
    for (let i = 0; i < count; i++) {
        const crate = addCrate(level, `Crate ${i}`);
        crate.addComponent(new StyleComponent());
        crates.push(crate);
    }

    const { session } = showInspector(level);
    select(session, crates);
    await expect.poll(() => inspectorContainer().querySelector('.card-field[data-key="fill"]')).not.toBeNull();

    return { crates, session };
}

async function typeInto(box: HTMLInputElement, text: string) {
    await userEvent.click(box);
    await userEvent.fill(box, text);
    await userEvent.keyboard('{Enter}');
}

// What the browser's picker does when a colour is chosen: input while dragging, change once at the end.
function pickColour(picker: HTMLInputElement, rgb: string) {
    picker.value = rgb;
    picker.dispatchEvent(new Event('input', { bubbles: true }));
    picker.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Inspector: the vector field', () => {
    test('shows two boxes with their axis letters, and a box commits its own axis as one step', async () => {
        const { crates, session } = await showCrates(1);
        const crate = crates[0] as Entity;
        const row = fieldRow('TransformComponent', 'position');
        const letters = [...row.querySelectorAll('.axis')].map((letter) => letter.textContent);
        expect(letters).toEqual(['X', 'Y']);

        await typeInto(axisBox('position', 'y'), '40');

        await expect.poll(() => transformOf(crate).get('position')).toEqual({ x: 0, y: 40 });
        expect(undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Position');
    });

    test('a scale vector refuses 0 in either box', async () => {
        const { crates, session } = await showCrates(1);
        const crate = crates[0] as Entity;

        for (const axis of ['x', 'y'] as const) {
            const box = axisBox('scale', axis);
            await typeInto(box, '0');

            expect(box.getAttribute('aria-invalid')).toBe('true');
            expect(axisMessage('scale', axis)).toBe("Scale can't be 0");
            await userEvent.click(levelView);
        }

        expect(transformOf(crate).get('scale')).toEqual({ x: 1, y: 1 });
        expect(undoCount(session)).toBe(0);
    });

    test('an axis the entities do not share reads Mixed, and typing it keeps each one its other axis', async () => {
        const { crates, session } = await showCrates(2);
        const [first, second] = crates as [Entity, Entity];
        transformOf(first).set('position', { x: 10, y: 1 });
        transformOf(second).set('position', { x: 10, y: 2 });
        select(session, []);
        select(session, crates);

        await expect.poll(() => axisBox('position', 'y').placeholder).toBe('Mixed');
        expect(axisBox('position', 'x').value).toBe('10');

        await typeInto(axisBox('position', 'x'), '5');

        await expect.poll(() => transformOf(first).get('position')).toEqual({ x: 5, y: 1 });
        expect(transformOf(second).get('position')).toEqual({ x: 5, y: 2 });
        expect(undoCount(session)).toBe(1);
    });
});

describe('Inspector: the colour field', () => {
    test('shows the code in capitals, and a typed code makes one step', async () => {
        const { crates, session } = await showCrates(1);
        const crate = crates[0] as Entity;
        expect(codeBox('outlineColour').value).toBe('#1F3552FF');

        await typeInto(codeBox('outlineColour'), '#ff000080');

        await expect.poll(() => styleOf(crate).get('outlineColour')).toBe('#FF000080');
        expect(undoCount(session)).toBe(1);
        expect(document.activeElement).toBe(levelView);
    });

    test('a code that is not a colour is refused with its reason', async () => {
        const { crates } = await showCrates(1);
        const box = codeBox('outlineColour');

        await typeInto(box, 'blue');

        expect(box.getAttribute('aria-invalid')).toBe('true');
        expect(fieldRow('StyleComponent', 'outlineColour').querySelector('.field-message')?.textContent).toBe(
            'Not a colour code',
        );
        expect(styleOf(crates[0] as Entity).get('outlineColour')).toBe('#1F3552FF');
    });

    test('a picked colour makes one step, keeping the see-through part', async () => {
        const { crates, session } = await showCrates(1);
        const crate = crates[0] as Entity;
        styleOf(crate).set('outlineColour', '#11223380');
        select(session, []);
        select(session, crates);
        await expect.poll(() => codeBox('outlineColour').value).toBe('#11223380');

        pickColour(pickerOf('outlineColour'), '#00ff00');

        await expect.poll(() => styleOf(crate).get('outlineColour')).toBe('#00FF0080');
        expect(undoCount(session)).toBe(1);
    });

    test('different colours show Mixed', async () => {
        const { crates } = await showCrates(2);
        styleOf(crates[0] as Entity).set('outlineColour', '#000000FF');

        await expect.poll(() => codeBox('outlineColour').placeholder).toBe('Mixed');
        expect(codeBox('outlineColour').value).toBe('');
    });
});

describe('Inspector: the fill field', () => {
    test('emptying a fill shows None, and switching None off brings the colour back, one step each', async () => {
        const { crates, session } = await showCrates(1);
        const crate = crates[0] as Entity;
        const noneSwitch = requireElement<HTMLButtonElement>(fieldRow('StyleComponent', 'fill'), 'button.none');

        await userEvent.click(noneSwitch);

        await expect.poll(() => styleOf(crate).get('fill')).toEqual({ kind: 'none' });
        expect(codeBox('fill').value).toBe('');
        expect(codeBox('fill').placeholder).toBe('None');
        expect(noneSwitch.getAttribute('aria-pressed')).toBe('true');
        const swatch = requireElement<HTMLElement>(fieldRow('StyleComponent', 'fill'), '.colour-swatch');
        expect(swatch.dataset['none']).toBe('true');

        await userEvent.click(noneSwitch);

        await expect.poll(() => styleOf(crate).get('fill')).toEqual({ kind: 'solid', colour: '#4A90D9FF' });
        expect(undoCount(session)).toBe(2);
    });

    test('typing a code into an empty fill fills it', async () => {
        const { crates } = await showCrates(1);
        const crate = crates[0] as Entity;
        styleOf(crate).set('fill', { kind: 'none' });

        await typeInto(codeBox('fill'), '123456');

        await expect.poll(() => styleOf(crate).get('fill')).toEqual({ kind: 'solid', colour: '#123456FF' });
    });
});

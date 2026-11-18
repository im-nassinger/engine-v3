import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { BodyComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
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

let levelView: HTMLElement;

// The place Enter gives the keyboard back to.
beforeEach(() => {
    openEntityInspectorPage();
    levelView = document.createElement('div');
    levelView.dataset['focusPlace'] = 'level';
    levelView.tabIndex = -1;
    levelView.style.width = '200px';
    levelView.style.height = '100px';
    document.body.append(levelView);
});

afterEach(() => {
    closeEntityInspectorPage();
    levelView.remove();
});

function fieldRow(typeName: string, key: string) {
    return requireElement<HTMLElement>(requireCard(typeName), `.card-field[data-key="${key}"]`);
}

function boxOf(typeName: string, key: string) {
    return requireElement<HTMLInputElement>(fieldRow(typeName, key), 'input:not([type])');
}

function pillOf(typeName: string, key: string) {
    return requireElement<HTMLElement>(fieldRow(typeName, key), '.number-box');
}

// A pointer on the pill, at this share of its width from the left.
function pointerAt(pill: HTMLElement, share: number) {
    const { left, top, width, height } = pill.getBoundingClientRect();

    return { clientX: left + share * width, clientY: top + height / 2, bubbles: true, button: 0, isPrimary: true };
}

function pressAt(pill: HTMLElement, share: number) {
    pill.dispatchEvent(new PointerEvent('pointerdown', pointerAt(pill, share)));
}

function moveTo(pill: HTMLElement, share: number) {
    window.dispatchEvent(new PointerEvent('pointermove', pointerAt(pill, share)));
}

function letGo() {
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
}

function messageOf(typeName: string, key: string) {
    return fieldRow(typeName, key).querySelector('.field-message')?.textContent;
}

function linearDamping(entity: Entity) {
    return entity.requireComponent(BodyComponent).get('linearDamping');
}

async function showCrate() {
    const level = Level.createNew();
    const crate = addCrate(level, 'Crate');
    const { session } = showEntityInspector(level);
    select(session, [crate]);
    await expect
        .poll(() => entityInspectorContainer().querySelector('.card-field[data-key="linearDamping"]'))
        .not.toBeNull();

    return { level, crate, session };
}

async function typeInto(box: HTMLInputElement, text: string) {
    await userEvent.click(box);
    await userEvent.fill(box, text);
}

function menuEntryNamed(label: string) {
    const entries = entityInspectorContainer().querySelectorAll<HTMLElement>('[role="menuitem"]');

    return [...entries].find((entry) => entry.textContent.trim() === label);
}

function undoLabel(session: EditorSession) {
    return session.openLevel.history.undoLabel;
}

describe('Entity inspector fields', () => {
    test('text that is not a number gets a red outline and its reason, and leaving restores the old value', async () => {
        await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, 'abc');
        await userEvent.keyboard('{Enter}');

        expect(box.getAttribute('aria-invalid')).toBe('true');
        expect(messageOf('BodyComponent', 'linearDamping')).toBe('Not a number');
        expect(document.activeElement).toBe(box);

        await userEvent.click(levelView);

        await expect.poll(() => box.value).toBe('0');
        expect(box.getAttribute('aria-invalid')).toBe('false');
        expect(messageOf('BodyComponent', 'linearDamping')).toBeUndefined();
    });

    test('a number too large is refused', async () => {
        const { crate } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, '1e12');
        await userEvent.keyboard('{Enter}');

        expect(messageOf('BodyComponent', 'linearDamping')).toBe('Too large');
        expect(linearDamping(crate)).toBe(0);
    });

    test('a value past the maximum is clamped, with a brief note, as one step', async () => {
        const { crate, session } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, '150');
        await userEvent.keyboard('{Enter}');

        await expect.poll(() => linearDamping(crate)).toBe(100);
        expect(messageOf('BodyComponent', 'linearDamping')).toBe('Max is 100');
        expect(undoLabel(session)).toBe('Change Linear damping');
        await expect.poll(() => messageOf('BodyComponent', 'linearDamping'), { timeout: 4000 }).toBeUndefined();
    });

    test('a comma is a decimal point, and the unit may be typed', async () => {
        const { crate } = await showCrate();

        await typeInto(boxOf('BodyComponent', 'linearDamping'), '1,5');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => linearDamping(crate)).toBe(1.5);

        await typeInto(boxOf('TransformComponent', 'rotation'), '45°');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => crate.requireComponent(TransformComponent).get('rotation')).toBe(45);
    });

    test('empty text restores the old value and makes no step', async () => {
        const { session } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, '');
        await userEvent.keyboard('{Enter}');

        await expect.poll(() => box.value).toBe('0');
        expect(undoLabel(session)).toBeUndefined();
    });

    test('a skew of 90° is refused with its reason', async () => {
        const { crate } = await showCrate();

        await typeInto(boxOf('TransformComponent', 'skew'), '90');
        await userEvent.keyboard('{Enter}');

        expect(messageOf('TransformComponent', 'skew')).toBe('Skew must be between −90° and 90°');
        expect(crate.requireComponent(TransformComponent).get('skew')).toBe(0);
    });

    test('a focused field shows the full value, and an unfocused one rounds to 2 decimals', async () => {
        const level = Level.createNew();
        const crate = addCrate(level, 'Crate');
        crate.requireComponent(BodyComponent).set('linearDamping', 1.23456);
        const { session } = showEntityInspector(level);
        select(session, [crate]);
        await expect
            .poll(() => entityInspectorContainer().querySelector('.card-field[data-key="linearDamping"]'))
            .not.toBeNull();
        const box = boxOf('BodyComponent', 'linearDamping');

        expect(box.value).toBe('1.23');
        await userEvent.click(box);
        await expect.poll(() => box.value).toBe('1.23456');

        await userEvent.click(levelView);
        await expect.poll(() => box.value).toBe('1.23');
        expect(linearDamping(crate)).toBe(1.23456);
    });

    test('Enter commits and gives the keyboard back to the level view', async () => {
        const { crate, session } = await showCrate();

        await typeInto(boxOf('BodyComponent', 'linearDamping'), '3');
        await userEvent.keyboard('{Enter}');

        await expect.poll(() => linearDamping(crate)).toBe(3);
        expect(document.activeElement).toBe(levelView);
        expect(undoLabel(session)).toBe('Change Linear damping');
    });

    test('Tab commits and moves to the next field', async () => {
        const { crate } = await showCrate();

        await typeInto(boxOf('BodyComponent', 'linearDamping'), '4');
        await userEvent.tab();

        await expect.poll(() => linearDamping(crate)).toBe(4);
        expect(document.activeElement).toBe(boxOf('BodyComponent', 'angularDamping'));
    });

    test('Esc restores the old value and makes no step', async () => {
        const { crate, session } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, '7');
        await userEvent.keyboard('{Escape}');

        await expect.poll(() => box.value).toBe('0');
        expect(linearDamping(crate)).toBe(0);
        expect(undoLabel(session)).toBeUndefined();
    });

    test('Ctrl+Z with typed text stays in the field, and with none undoes the level', async () => {
        const { crate, session } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await typeInto(box, '5');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => linearDamping(crate)).toBe(5);

        await typeInto(box, '9');
        await userEvent.keyboard('{Control>}z{/Control}');
        expect(linearDamping(crate)).toBe(5);
        expect(undoLabel(session)).toBe('Change Linear damping');

        await userEvent.keyboard('{Escape}');
        await userEvent.click(box);
        await userEvent.keyboard('{Control>}z{/Control}');

        await expect.poll(() => linearDamping(crate)).toBe(0);
        expect(undoLabel(session)).toBeUndefined();
        await expect.poll(() => box.value).toBe('0');
        expect(document.activeElement).toBe(box);
    });

    test('a number with both limits is a filled slider; one without, or with refused limits, is not', async () => {
        await showCrate();

        expect(pillOf('BodyComponent', 'linearDamping').dataset['slider']).toBe('true');
        expect(pillOf('TransformComponent', 'rotation').dataset['slider']).toBe('false');
        expect(pillOf('TransformComponent', 'skew').dataset['slider']).toBe('false');
    });

    test('dragging across the slider changes the level while dragged and is one step when let go', async () => {
        const { crate, session } = await showCrate();
        const pill = pillOf('BodyComponent', 'linearDamping');

        pressAt(pill, 0);
        for (const share of [0.1, 0.18, 0.25]) {
            moveTo(pill, share);
        }
        await expect.poll(() => boxOf('BodyComponent', 'linearDamping').value).toBe('25');
        expect(linearDamping(crate)).toBe(25);
        expect(session.openLevel.history.undoCount).toBe(0);
        expect(pill.style.getPropertyValue('--filled')).toBe('25%');

        letGo();
        await expect.poll(() => session.openLevel.history.undoCount).toBe(1);
        expect(undoLabel(session)).toBe('Change Linear damping');
        expect(document.activeElement).not.toBe(boxOf('BodyComponent', 'linearDamping'));

        session.openLevel.editor.undo();
        expect(linearDamping(crate)).toBe(0);
    });

    test('a click on the slider without a drag types in it and changes nothing', async () => {
        const { crate, session } = await showCrate();
        const box = boxOf('BodyComponent', 'linearDamping');

        await userEvent.click(box);

        await expect.poll(() => document.activeElement).toBe(box);
        expect(linearDamping(crate)).toBe(0);
        expect(session.openLevel.history.undoCount).toBe(0);
        await userEvent.fill(box, '7');
        await userEvent.keyboard('{Enter}');
        await expect.poll(() => linearDamping(crate)).toBe(7);
    });

    test('Esc during a slider drag puts the value back and the release makes no step', async () => {
        const { crate, session } = await showCrate();
        const pill = pillOf('BodyComponent', 'linearDamping');

        pressAt(pill, 0);
        moveTo(pill, 0.25);
        await expect.poll(() => linearDamping(crate)).toBe(25);

        session.openLevel.liveEdit.cancel();
        letGo();

        expect(linearDamping(crate)).toBe(0);
        expect(session.openLevel.history.undoCount).toBe(0);
    });

    test('a checkbox click is one step', async () => {
        const { crate, session } = await showCrate();
        const checkbox = requireElement<HTMLInputElement>(fieldRow('BodyComponent', 'fixedRotation'), 'input');

        await userEvent.click(checkbox);

        await expect.poll(() => crate.requireComponent(BodyComponent).get('fixedRotation')).toBe(true);
        expect(undoLabel(session)).toBe('Change Fixed rotation');
        await expect.poll(() => checkbox.checked).toBe(true);
    });

    test('a choice is picked from its menu in one step, and greys the fields it turns off', async () => {
        const { crate, session } = await showCrate();
        const choice = requireElement<HTMLButtonElement>(fieldRow('BodyComponent', 'type'), 'button');
        expect(choice.textContent).toBe('Dynamic');

        await userEvent.click(choice);
        await expect.poll(() => menuEntryNamed('Static')).toBeDefined();
        const entry = menuEntryNamed('Static');
        if (entry === undefined) throw new Error('No Static entry.');
        await userEvent.click(entry);

        await expect.poll(() => crate.requireComponent(BodyComponent).get('type')).toBe('static');
        expect(undoLabel(session)).toBe('Change Type');
        await expect.poll(() => boxOf('BodyComponent', 'linearDamping').disabled).toBe(true);
        expect(fieldRow('BodyComponent', 'linearDamping').dataset['enabled']).toBe('false');
    });

    test('different values show Mixed, and a typed value sets them all in one step', async () => {
        const level = Level.createNew();
        const first = addCrate(level, 'First');
        const second = addCrate(level, 'Second');
        second.requireComponent(BodyComponent).set('linearDamping', 2);
        const { session } = showEntityInspector(level);
        select(session, [first, second]);
        await expect
            .poll(() => entityInspectorContainer().querySelector('.card-field[data-key="linearDamping"]'))
            .not.toBeNull();
        const box = boxOf('BodyComponent', 'linearDamping');

        expect(box.value).toBe('');
        expect(box.placeholder).toBe('Mixed');

        await typeInto(box, '6');
        await userEvent.keyboard('{Enter}');

        await expect.poll(() => linearDamping(first)).toBe(6);
        expect(linearDamping(second)).toBe(6);
        expect(undoLabel(session)).toBe('Change Linear damping');
    });

    test('Mass is a read-only value with its unit', async () => {
        await showCrate();

        const mass = requireElement(fieldRow('BodyComponent', 'mass'), '.read-only-value');
        expect(mass.textContent).toBe('4kg');
        expect(fieldRow('BodyComponent', 'mass').querySelector('input')).toBeNull();
    });
});

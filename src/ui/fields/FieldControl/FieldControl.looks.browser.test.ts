import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import {
    CheckboxFieldType,
    ChoiceFieldType,
    ColourFieldType,
    NumberFieldType,
    TextFieldType,
    VectorFieldType,
} from '../../../core/fields/index.ts';
import { MIXED } from '../../../editor/entity-inspector/index.ts';
import { styleOf, tokenColour } from '../../shared/testing/controlLooks.ts';
import { closeField, definitionOf, showField, shownFieldPart } from './testing/showField.ts';

// Each field state of docs/design/controls.md, compared with the tokens it should use.

afterEach(() => {
    closeField();
});

function isPill(element: HTMLElement) {
    const halfHeight = element.getBoundingClientRect().height / 2;

    return styleOf(element).borderTopLeftRadius === `${halfHeight}px`;
}

function ringColour(element: HTMLElement) {
    const style = styleOf(element);
    if (style.outlineStyle === 'none') return undefined;

    return style.outlineColor;
}

describe('the fields’ looks', () => {
    test('a number is a pill of the field colour with no edge', async () => {
        showField(definitionOf('Count', new NumberFieldType()), 3);
        const pill = await shownFieldPart('.number-box');

        expect(isPill(pill)).toBe(true);
        expect(styleOf(pill).backgroundColor).toBe(tokenColour('--field'));
        expect(styleOf(pill).borderTopStyle).toBe('none');
        expect(ringColour(pill)).toBeUndefined();
    });

    test('a focused number has an accent ring and shows its full value', async () => {
        showField(definitionOf('Count', new NumberFieldType()), 1.23456);
        const pill = await shownFieldPart('.number-box');
        const box = await shownFieldPart<HTMLInputElement>('.number-box input');
        expect(box.value).toBe('1.23');

        await userEvent.click(box);

        await expect.poll(() => ringColour(pill)).toBe(tokenColour('--accent'));
        expect(box.value).toBe('1.23456');
    });

    test('a refused number has a danger ring and its reason under it in the danger colour', async () => {
        showField(definitionOf('Count', new NumberFieldType()), 3);
        const pill = await shownFieldPart('.number-box');
        const box = await shownFieldPart<HTMLInputElement>('.number-box input');

        await userEvent.click(box);
        await userEvent.fill(box, 'abc');
        await userEvent.keyboard('{Enter}');

        const message = await shownFieldPart('.field-message');
        await expect.poll(() => ringColour(pill)).toBe(tokenColour('--danger'));
        expect(styleOf(message).color).toBe(tokenColour('--danger'));
    });

    test('a clamped number’s note is muted', async () => {
        showField(definitionOf('Count', new NumberFieldType({ max: 100 })), 3);
        const box = await shownFieldPart<HTMLInputElement>('.number-box input');

        await userEvent.click(box);
        await userEvent.fill(box, '500');
        await userEvent.keyboard('{Enter}');

        const message = await shownFieldPart('.field-message');
        expect(message.textContent).toBe('Max is 100');
        expect(styleOf(message).color).toBe(tokenColour('--muted'));
    });

    test('Mixed is muted italics', async () => {
        showField(definitionOf('Count', new NumberFieldType()), MIXED);
        const box = await shownFieldPart<HTMLInputElement>('.number-box input');
        const placeholder = getComputedStyle(box, '::placeholder');

        expect(box.placeholder).toBe('Mixed');
        expect(placeholder.color).toBe(tokenColour('--muted'));
        expect(placeholder.fontStyle).toBe('italic');
    });

    test('a disabled number keeps its value in the faint colour', async () => {
        showField(definitionOf('Count', new NumberFieldType()), 3, { isEnabled: false });
        const box = await shownFieldPart<HTMLInputElement>('.number-box input');

        expect(box.value).toBe('3');
        expect(styleOf(box).color).toBe(tokenColour('--faint'));
    });

    test('a number with both limits is filled in the soft accent up to its value', async () => {
        showField(definitionOf('Damping', new NumberFieldType({ min: 0, max: 10 })), 4);
        const pill = await shownFieldPart('.number-box');

        expect(isPill(pill)).toBe(true);
        expect(pill.style.getPropertyValue('--filled')).toBe('40%');
        expect(styleOf(pill).backgroundColor).toBe(tokenColour('--field'));
        expect(styleOf(pill).backgroundImage).toContain(tokenColour('--accent-soft'));
    });

    test('a vector is two pills, each starting with its muted axis letter', async () => {
        showField(definitionOf('Position', new VectorFieldType()), { x: 1, y: 2 });
        await shownFieldPart('.vector-field .number-box');
        const pills = [...document.querySelectorAll<HTMLElement>('.vector-field .number-box')];

        expect(pills).toHaveLength(2);
        for (const pill of pills) {
            expect(isPill(pill)).toBe(true);
            expect(styleOf(pill.querySelector('.axis') ?? pill).color).toBe(tokenColour('--muted'));
        }
        expect(pills.map((pill) => pill.querySelector('.axis')?.textContent)).toEqual(['X', 'Y']);
    });

    test('a text is a pill with an accent ring while focused', async () => {
        showField(definitionOf('Label', new TextFieldType()), 'Door');
        const box = await shownFieldPart<HTMLInputElement>('.text-field');

        expect(isPill(box)).toBe(true);
        expect(styleOf(box).backgroundColor).toBe(tokenColour('--field'));
        await userEvent.click(box);
        await expect.poll(() => ringColour(box)).toBe(tokenColour('--accent'));
    });

    test('a choice is a pill with a down arrow', async () => {
        const type = new ChoiceFieldType([
            { value: 'a', label: 'One' },
            { value: 'b', label: 'Two' },
        ]);
        showField(definitionOf('Kind', type), 'a');
        const toggle = await shownFieldPart('.choice-field .toggle');

        expect(isPill(toggle)).toBe(true);
        expect(toggle.querySelector('.arrow')).not.toBeNull();
    });

    test('a colour is a pill with a 14 px swatch with 4 px corners', async () => {
        showField(definitionOf('Colour', new ColourFieldType()), '#FF8800FF');
        const row = await shownFieldPart('.colour-box > .row');
        const swatch = await shownFieldPart('.colour-swatch');

        expect(isPill(row)).toBe(true);
        expect(swatch.getBoundingClientRect().width).toBe(14);
        expect(styleOf(swatch).borderTopLeftRadius).toBe('4px');
    });

    test('a checkbox is a 28 × 16 switch: off in the field colour, on in the accent with its knob at the right', async () => {
        showField(definitionOf('Fixed', new CheckboxFieldType()), false);
        const offSwitch = await shownFieldPart<HTMLInputElement>('.checkbox-field');
        const offKnob = getComputedStyle(offSwitch, '::before');

        expect(offSwitch.type).toBe('checkbox');
        expect(offSwitch.getBoundingClientRect().width).toBe(28);
        expect(offSwitch.getBoundingClientRect().height).toBe(16);
        expect(isPill(offSwitch)).toBe(true);
        expect(styleOf(offSwitch).backgroundColor).toBe(tokenColour('--field'));
        expect(offKnob.backgroundColor).toBe(tokenColour('--muted'));

        showField(definitionOf('Fixed', new CheckboxFieldType()), true);
        const onSwitch = await shownFieldPart<HTMLInputElement>('.checkbox-field');
        const onKnob = getComputedStyle(onSwitch, '::before');

        expect(onSwitch.checked).toBe(true);
        expect(styleOf(onSwitch).backgroundColor).toBe(tokenColour('--accent'));
        expect(onKnob.backgroundColor).toBe(tokenColour('--on-accent'));
        expect(onKnob.translate).toBe('12px');
    });

    test('a switch is still a checkbox for the keyboard', async () => {
        const committed = showField(definitionOf('Fixed', new CheckboxFieldType()), false);
        const toggle = await shownFieldPart<HTMLInputElement>('.checkbox-field');

        toggle.focus();
        await userEvent.keyboard(' ');

        expect(committed).toEqual([true]);
    });
});

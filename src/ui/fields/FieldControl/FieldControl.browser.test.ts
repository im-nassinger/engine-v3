import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { NumberFieldType, TextFieldType } from '../../../core/fields/index.ts';
import { MIXED } from '../../../editor/entity-inspector/index.ts';
import { closeField, definitionOf, fieldContainer, showField, shownFieldPart } from './testing/showField.ts';

afterEach(() => {
    closeField();
});

function shownInput() {
    return shownFieldPart<HTMLInputElement>('input');
}

describe('FieldControl', () => {
    test('a fraction in a whole-number field is rounded', async () => {
        const type = new NumberFieldType({ min: 1, wholeNumber: true });
        const committed = showField(definitionOf('Count', type), 3);
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.fill(box, '4.6');
        await userEvent.keyboard('{Enter}');

        expect(committed).toEqual([5]);
    });

    test('a value below the minimum is clamped with its note', async () => {
        const type = new NumberFieldType({ min: 1, wholeNumber: true });
        const committed = showField(definitionOf('Count', type), 3);
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.fill(box, '-2');
        await userEvent.keyboard('{Enter}');

        expect(committed).toEqual([1]);
        await expect.poll(() => fieldContainer().querySelector('.field-message')?.textContent).toBe('Min is 1');
    });

    test('a text field commits on Enter, and an unchanged text commits nothing', async () => {
        const committed = showField(definitionOf('Label', new TextFieldType()), 'Door');
        const box = await shownInput();

        await userEvent.click(box);
        await userEvent.keyboard('{Enter}');
        expect(committed).toEqual([]);

        await userEvent.click(box);
        await userEvent.fill(box, 'Gate');
        await userEvent.keyboard('{Enter}');
        expect(committed).toEqual(['Gate']);
    });

    test('a text field with different values shows Mixed', async () => {
        showField(definitionOf('Label', new TextFieldType()), MIXED);
        const box = await shownInput();

        expect(box.value).toBe('');
        expect(box.placeholder).toBe('Mixed');
    });
});

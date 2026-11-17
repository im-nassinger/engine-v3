import { afterEach, describe, expect, test } from 'vitest';

import { commitFocusedField } from './commitFocusedField.ts';

let field: HTMLInputElement | undefined;

afterEach(() => {
    field?.remove();
    field = undefined;
});

describe('commitFocusedField', () => {
    test('takes the keyboard from the focused field, which commits it on blur', () => {
        const input = document.createElement('input');
        field = input;
        document.body.append(input);
        const committed: string[] = [];
        input.addEventListener('blur', () => committed.push(input.value));
        input.focus();
        input.value = '42';

        commitFocusedField(document);

        expect(committed).toEqual(['42']);
        expect(document.activeElement).not.toBe(input);
    });

    test('does nothing with nothing focused', () => {
        expect(() => commitFocusedField(document)).not.toThrow();
    });
});

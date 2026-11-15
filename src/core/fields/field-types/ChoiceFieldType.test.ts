import { describe, expect, test } from 'vitest';

import { ChoiceFieldType } from './ChoiceFieldType.ts';

type BodyType = 'static' | 'dynamic' | 'kinematic';

describe('ChoiceFieldType', () => {
    const fieldType = new ChoiceFieldType<BodyType>([
        { value: 'static', label: 'Static' },
        { value: 'dynamic', label: 'Dynamic' },
        { value: 'kinematic', label: 'Kinematic' },
    ]);

    test('parse accepts one of the options', () => {
        expect(fieldType.parse('dynamic')).toEqual({ ok: true, value: 'dynamic' });
    });

    test('parse refuses a text that is not an option, labels included', () => {
        for (const raw of ['Dynamic', 'bouncy', '']) {
            expect(fieldType.parse(raw)).toEqual({ ok: false, problem: { reason: 'unknownChoice' } });
        }
    });

    test('parse refuses what is not a text', () => {
        expect(fieldType.parse(1)).toEqual({ ok: false, problem: { reason: 'wrongType' } });
    });

    test('the options keep their order and labels', () => {
        const labels = fieldType.options.map((option) => option.label);

        expect(labels).toEqual(['Static', 'Dynamic', 'Kinematic']);
    });

    test('a choice with no options is a bug', () => {
        expect(() => new ChoiceFieldType([])).toThrow();
    });
});

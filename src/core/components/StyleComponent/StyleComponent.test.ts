import { describe, expect, test } from 'vitest';

import { StyleComponent } from './StyleComponent.ts';

describe('StyleComponent', () => {
    test("a new one has v1's default look", () => {
        const style = new StyleComponent();

        expect(style.get('fill')).toEqual({ kind: 'solid', colour: '#4A90D9FF' });
        expect(style.get('outlineColour')).toBe('#1F3552FF');
        expect(style.get('outlineWidth')).toBe(2);
        expect(style.get('scaleOutline')).toBe(false);
        expect(style.get('opacity')).toBe(1);
    });

    test('Scale outline is a checkbox right under the outline width', () => {
        const keys = StyleComponent.schema.fields.map((field) => field.key);
        const scaleOutline = StyleComponent.schema.fields.find((field) => field.key === 'scaleOutline');

        expect(keys.indexOf('scaleOutline')).toBe(keys.indexOf('outlineWidth') + 1);
        expect(scaleOutline?.label).toBe('Scale outline');
        expect(scaleOutline?.type.kind).toBe('checkbox');
    });

    test('the fill can be emptied', () => {
        const style = new StyleComponent();

        expect(style.writeValue('fill', { kind: 'none' })).toEqual({ ok: true, value: { kind: 'none' } });
    });

    test('outline width and opacity are clamped to their ranges', () => {
        const style = new StyleComponent();

        expect(style.writeValue('outlineWidth', 500)).toEqual({ ok: true, value: 200 });
        expect(style.writeValue('opacity', -1)).toEqual({ ok: true, value: 0 });
    });

    test('every value can change during play', () => {
        const fixedInPlay = StyleComponent.schema.fields.filter((field) => !field.changeableInPlay);

        expect(fixedInPlay).toEqual([]);
    });

    test('its note ends with a ShapeComponent or a PathComponent', () => {
        expect(StyleComponent.schema.partners).toEqual([
            {
                partner: 'ShapeComponent',
                alsoSatisfiedBy: ['PathComponent'],
                noteText: 'Needs a Shape to draw anything.',
            },
        ]);
    });
});

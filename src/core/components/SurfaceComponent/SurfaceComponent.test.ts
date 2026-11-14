import { describe, expect, test } from 'vitest';

import { SurfaceComponent } from './SurfaceComponent.ts';

describe('SurfaceComponent', () => {
    test('a new surface has the defaults of the requirements', () => {
        const surface = new SurfaceComponent();

        expect(surface.get('density')).toBe(1);
        expect(surface.get('friction')).toBe(0.3);
        expect(surface.get('restitution')).toBe(0);
        expect(surface.get('sensor')).toBe(false);
    });

    test('values are clamped to their ranges', () => {
        const surface = new SurfaceComponent();

        expect(surface.writeValue('friction', 9)).toEqual({ ok: true, value: 5 });
        expect(surface.writeValue('restitution', -1)).toEqual({ ok: true, value: 0 });
    });

    test('only Density is fixed during play', () => {
        const fixedInPlay = SurfaceComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['density']);
    });
});

import { describe, expect, test } from 'vitest';

import { CameraComponent } from './CameraComponent.ts';

describe('CameraComponent', () => {
    test('a new camera is 1920 × 1080 in Fixed size, following nothing, with 0.3 s of smoothing', () => {
        const camera = new CameraComponent();

        expect(camera.get('width')).toBe(1920);
        expect(camera.get('height')).toBe(1080);
        expect(camera.get('follow')).toBeNull();
        expect(camera.get('smoothing')).toBe(0.3);
        expect(camera.get('mode')).toBe('fixedSize');
    });

    test('width and height go from 160 to 7,680 px, smoothing from 0 to 5 s', () => {
        const camera = new CameraComponent();

        expect(camera.writeValue('width', 10)).toEqual({ ok: true, value: 160 });
        expect(camera.writeValue('height', 10_000)).toEqual({ ok: true, value: 7680 });
        expect(camera.writeValue('smoothing', -1)).toEqual({ ok: true, value: 0 });
        expect(camera.writeValue('smoothing', 9)).toEqual({ ok: true, value: 5 });
    });

    test("the camera's size can't change during play", () => {
        const fixedInPlay = CameraComponent.schema.fields.filter((field) => !field.changeableInPlay);
        const fixedKeys = fixedInPlay.map((field) => field.key);

        expect(fixedKeys).toEqual(['width', 'height']);
    });

    test("it isn't in the Add Component menu: a level has exactly one camera", () => {
        expect(CameraComponent.schema.addableByHand).toBe(false);
        expect(CameraComponent.schema.addMenuSection).toBeUndefined();
    });

    test("a mode v1 doesn't know is refused", () => {
        const modeType = CameraComponent.schema.findEntry('mode')?.type;

        expect(modeType?.parse('fixedSize').ok).toBe(true);
        expect(modeType?.parse('fillWindow').ok).toBe(false);
    });
});

import { describe, expect, test } from 'vitest';
import { edgeFadeMask } from './edgeFadeMask.ts';

const NOTHING = { top: 0, bottom: 0, left: 0, right: 0 };

function gradients(image: string) {
    return image.split(/,\s*(?=linear-gradient|url)/);
}

describe('edgeFadeMask', () => {
    test('is nothing while no edge hides blocks', () => {
        expect(edgeFadeMask(NOTHING)).toBeUndefined();
        expect(edgeFadeMask({ ...NOTHING, right: 0.2 })).toBeUndefined();
    });

    test('fades only the edges hiding blocks, eased, with the grain between the fades', () => {
        const mask = edgeFadeMask({ ...NOTHING, right: 40 });
        if (mask === undefined) throw new Error('No mask.');

        const [vertical, horizontal, noise] = gradients(mask.image);
        expect(vertical).toBe('linear-gradient(to bottom, #000, #000, #000)');
        expect(horizontal).toContain('rgba(0,0,0,0) calc(100% - 0px)');
        expect(horizontal).toContain('rgba(0,0,0,0.5) calc(100% - 12px)');
        expect(horizontal).toContain('rgba(0,0,0,1) calc(100% - 24px)');
        expect(horizontal).not.toMatch(/\) \d/);
        expect(noise).toMatch(/^url\("data:image\/svg\+xml,/);
        expect(mask.composite).toBe('intersect, intersect, add, intersect, add');
    });

    test('is shorter than 24 px while less than that is hidden', () => {
        const mask = edgeFadeMask({ ...NOTHING, left: 8 });
        if (mask === undefined) throw new Error('No mask.');

        const [, horizontal] = gradients(mask.image);
        expect(horizontal).toContain('rgba(0,0,0,0) 0px');
        expect(horizontal).toContain('rgba(0,0,0,1) 8px');
    });
});

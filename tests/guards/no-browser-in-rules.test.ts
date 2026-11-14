import { describe, expect, test } from 'vitest';
import { typeCheckSample } from './typeCheckSample.ts';

const BROWSER_SAMPLE = 'tests/guards/samples/usesBrowser.ts';
const PAGE_SAMPLE = 'tests/guards/samples/usesPage.ts';

describe('no browser in the rules', () => {
    test.each([['src/core/tsconfig.json'], ['src/editor/tsconfig.json']])(
        'the type check refuses window and setTimeout with %s',
        (configPath) => {
            const errors = typeCheckSample(BROWSER_SAMPLE, configPath);

            expect(errors.some((error) => error.includes("'window'"))).toBe(true);
            expect(errors.some((error) => error.includes("'setTimeout'"))).toBe(true);
        },
    );

    test('the type check accepts window and setTimeout with the ui config', () => {
        const errors = typeCheckSample(BROWSER_SAMPLE, 'src/ui/tsconfig.json');

        expect(errors).toEqual([]);
    });
});

describe('no page in a worker', () => {
    test('the type check refuses document with the workers config', () => {
        const errors = typeCheckSample(PAGE_SAMPLE, 'src/app/workers/tsconfig.json');

        expect(errors.some((error) => error.includes("'document'"))).toBe(true);
    });
});

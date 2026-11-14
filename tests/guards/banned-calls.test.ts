import { describe, expect, test } from 'vitest';
import { lintSample } from './lintSample.ts';

describe('banned calls', () => {
    test.each([
        [
            'Math.sin in core',
            'src/core/math/sample.ts',
            'export const sample = Math.sin(1);',
            'no-restricted-properties',
        ],
        [
            '** in core',
            'src/core/math/sample.ts',
            'const x = 3;\nexport const sample = x ** 2;',
            'no-restricted-syntax',
        ],
        ['new Date() in core', 'src/core/math/sample.ts', 'export const sample = new Date();', 'no-restricted-globals'],
        ['Date.now() in core', 'src/core/math/sample.ts', 'export const sample = Date.now();', 'no-restricted-globals'],
        [
            'for ... in in core',
            'src/core/math/sample.ts',
            'export function sample(values: object) {\n    for (const key in values) {\n        return key;\n    }\n}',
            'no-restricted-syntax',
        ],
        [
            'Date.now() in editor',
            'src/editor/view/sample.ts',
            'export const sample = Date.now();',
            'no-restricted-globals',
        ],
    ])('refuses %s', async (_description, filePath, code, expectedRule) => {
        const problems = await lintSample(`${code}\n`, filePath);

        expect(problems).toContain(expectedRule);
    });

    test.each([
        ['Math.sqrt in core', 'src/core/math/sample.ts', 'export const sample = Math.sqrt(2);'],
        ['Math.sin in editor', 'src/editor/view/sample.ts', 'export const sample = Math.sin(1);'],
    ])('allows %s', async (_description, filePath, code) => {
        const problems = await lintSample(`${code}\n`, filePath);

        expect(problems).toEqual([]);
    });
});

import { describe, expect, test } from 'vitest';
import { lintSample } from './lintSample.ts';

describe('libraries', () => {
    test.each([
        ['core importing react', 'src/core/math/sample.ts', 'react'],
        ['editor importing pixi.js', 'src/editor/history/sample.ts', 'pixi.js'],
        ['ui importing pixi.js', 'src/ui/shell/sample.ts', 'pixi.js'],
        ['core importing vitest outside a test', 'src/core/math/sample.ts', 'vitest'],
        ['adapters importing box2d3-wasm', 'src/adapters/box2d/sample.ts', 'box2d3-wasm'],
        ['app importing box2d3-wasm', 'src/app/sample.ts', 'box2d3-wasm'],
        ['app importing another box2d3-wasm build', 'src/app/sample.ts', 'box2d3-wasm/dist/simd'],
        ['adapters importing node:fs', 'src/adapters/storage/sample.ts', 'node:fs'],
    ])('refuses %s', async (_description, filePath, library) => {
        const code = `import * as library from '${library}';\nexport const sample = library;\n`;

        const problems = await lintSample(code, filePath);

        expect(problems).toContain('no-restricted-imports');
    });

    test.each([
        ['a core test importing vitest', 'src/core/math/sample.test.ts', 'vitest'],
        ['adapters importing box2d3-wasm/compat', 'src/adapters/box2d/sample.ts', 'box2d3-wasm/compat'],
        ['ui importing react', 'src/ui/shell/sample.ts', 'react'],
    ])('allows %s', async (_description, filePath, library) => {
        const code = `import * as library from '${library}';\nexport const sample = library;\n`;

        const problems = await lintSample(code, filePath);

        expect(problems).toEqual([]);
    });
});

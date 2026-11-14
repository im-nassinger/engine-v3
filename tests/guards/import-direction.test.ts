import { describe, expect, test } from 'vitest';
import { lintSample } from './lintSample.ts';

describe('import direction', () => {
    test.each([
        ['core importing editor', 'src/core/math/sample.ts', '../../editor/history/index.ts'],
        ['editor importing adapters', 'src/editor/history/sample.ts', '../../adapters/pixi/index.ts'],
        ['ui importing adapters', 'src/ui/shell/sample.ts', '../../adapters/pixi/index.ts'],
        ['adapters importing ui', 'src/adapters/pixi/sample.ts', '../../ui/shell/index.ts'],
    ])('refuses %s', async (_description, filePath, importPath) => {
        const code = `import * as other from '${importPath}';\nexport const sample = other;\n`;

        const problems = await lintSample(code, filePath);

        expect(problems).toContain('no-restricted-imports');
    });

    test('lets editor import core', async () => {
        const code = `import * as other from '../../core/math/index.ts';\nexport const sample = other;\n`;

        const problems = await lintSample(code, 'src/editor/history/sample.ts');

        expect(problems).toEqual([]);
    });
});

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

// The theme's tokens are the ones docs/design/tokens.md names, and every var() in the editor's code
// names one of them or a property the code sets itself (like --filled or --popup-room).
const THEME = 'src/ui/theme.css';
const TOKENS_DOC = 'docs/design/tokens.md';

// Round 8's tokens, dropped by the redesign (stage 19, step 3). The top bar, the status bar and the
// toolbar keep the redesign's sizes until their own steps replace them.
const REMOVED = [
    '--line',
    '--text-small',
    '--top-bar',
    '--status-bar',
    '--toolbar',
    '--entity-inspector-head',
    '--menu-item',
    '--space-12',
    '--space-16',
    '--radius-small',
    '--shadow-menu',
    '--shadow-dialog',
    '--shadow-options',
    '--shadow-tooltip',
];

function sourceFiles(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
        const path = join(folder, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);

        return /\.(css|ts|tsx)$/.test(entry.name) ? [path] : [];
    });
}

function matches(text: string, pattern: RegExp) {
    return [...text.matchAll(pattern)].map((match) => match[1] ?? '');
}

const themeText = readFileSync(THEME, 'utf8');
const themeTokens = new Set(matches(themeText, /^\s*(--[a-z0-9-]+):/gm));
const files = sourceFiles('src').map((path) => ({ path, text: readFileSync(path, 'utf8') }));

// A property the code sets itself: declared in a component's CSS, or set from TypeScript.
const setByCode = new Set(
    files
        .filter((file) => file.path !== THEME)
        .flatMap((file) => [
            ...matches(file.text, /^\s*(--[a-z0-9-]+):/gm),
            ...matches(file.text, /['"](--[a-z0-9-]+)['"]/g),
        ]),
);

describe('the theme tokens', () => {
    // CI's public copy of the code has no docs/ (docs/runner/public-ci.md), so this runs only on the laptop.
    const hasDocs = existsSync(TOKENS_DOC);

    test.skipIf(!hasDocs)('are the tokens docs/design/tokens.md names', () => {
        const documented = new Set(matches(readFileSync(TOKENS_DOC, 'utf8'), /`(--[a-z0-9-]+)`/g));

        expect([...themeTokens].sort()).toEqual([...documented].sort());
    });

    test('are the only tokens a var() names, besides properties the code sets itself', () => {
        const unknown = files.flatMap((file) =>
            matches(file.text, /var\((--[a-z0-9-]+)/g)
                .filter((name) => !themeTokens.has(name) && !setByCode.has(name))
                .map((name) => `${file.path}: ${name}`),
        );

        expect(unknown).toEqual([]);
    });

    test('leave no removed token anywhere in the code', () => {
        const left = files.flatMap((file) =>
            REMOVED.filter((name) => new RegExp(`${name}(?![a-z0-9-])`).test(file.text)).map(
                (name) => `${file.path}: ${name}`,
            ),
        );

        expect(left).toEqual([]);
    });
});

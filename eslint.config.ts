import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import type { Linter } from 'eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// The one place the polygon library is named. Only core/geometry/PolygonLibrary.ts imports it.
// See docs/architecture/core-model/geometry.md, "The polygon pipeline".
const POLYGON_LIBRARY = 'clipper2-ts';

// The Math functions the JavaScript standard lets a browser approximate, plus random.
export const BANNED_MATH_IN_CORE = [
    'sin',
    'cos',
    'tan',
    'asin',
    'acos',
    'atan',
    'atan2',
    'sinh',
    'cosh',
    'tanh',
    'asinh',
    'acosh',
    'atanh',
    'exp',
    'expm1',
    'log',
    'log1p',
    'log2',
    'log10',
    'cbrt',
    'pow',
    'hypot',
    'random',
];

// Exact by the standard. The guard test checks every Math member is in one of the two lists.
export const ALLOWED_MATH_IN_CORE = [
    'abs',
    'sign',
    'min',
    'max',
    'floor',
    'ceil',
    'round',
    'trunc',
    'sqrt',
    'fround',
    'f16round',
    'imul',
    'clz32',
    'E',
    'LN10',
    'LN2',
    'LOG10E',
    'LOG2E',
    'PI',
    'SQRT1_2',
    'SQRT2',
];

const LOCALE_METHODS = [
    'localeCompare',
    'toLocaleString',
    'toLocaleDateString',
    'toLocaleTimeString',
    'toLocaleUpperCase',
    'toLocaleLowerCase',
];

type PartName = 'core' | 'editor' | 'adapters' | 'ui' | 'app';

type Part = {
    name: PartName;
    folder: string;
    partsItMayNotImport: PartName[];
    // undefined means every library.
    librariesItMayImport: string[] | undefined;
};

const PARTS: Part[] = [
    {
        name: 'core',
        folder: 'src/core',
        partsItMayNotImport: ['editor', 'adapters', 'ui', 'app'],
        librariesItMayImport: [POLYGON_LIBRARY],
    },
    {
        name: 'editor',
        folder: 'src/editor',
        partsItMayNotImport: ['adapters', 'ui', 'app'],
        librariesItMayImport: [],
    },
    {
        name: 'adapters',
        folder: 'src/adapters',
        partsItMayNotImport: ['ui', 'app'],
        librariesItMayImport: ['pixi.js', 'box2d3-wasm/compat', 'idb', 'fflate'],
    },
    {
        name: 'ui',
        folder: 'src/ui',
        partsItMayNotImport: ['adapters', 'app'],
        librariesItMayImport: ['react', 'react-dom', '@tanstack/react-virtual', 'lucide-react'],
    },
    {
        name: 'app',
        folder: 'src/app',
        partsItMayNotImport: [],
        librariesItMayImport: undefined,
    },
];

const LIBRARIES_TESTS_MAY_ALSO_IMPORT = ['vitest'];

function escapeForRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function describeList(names: string[]) {
    if (names.length === 0) return 'none';

    return names.join(', ');
}

function buildLibraryPattern(part: Part, extraLibraries: string[]) {
    if (part.librariesItMayImport === undefined) return [];

    const allowedLibraries = [...part.librariesItMayImport, ...extraLibraries];
    const allowedAlternatives = allowedLibraries.map(escapeForRegex).join('|');
    const allowedLookahead = allowedLibraries.length === 0 ? '' : `(?!(?:${allowedAlternatives})(?:/|$))`;
    // Relative imports, node: and box2d3-wasm have their own patterns, so they are skipped here.
    const regex = `^(?![./])(?!node:)(?!box2d3-wasm(?:/|$))${allowedLookahead}.+`;
    const message = `${part.name} imports only these libraries: ${describeList(allowedLibraries)}.`;

    return [{ regex, message }];
}

function buildPartPatterns(part: Part) {
    return part.partsItMayNotImport.map((forbiddenPart) => {
        const message = `${part.name} may not import ${forbiddenPart}: imports point inward (app -> ui and adapters -> editor -> core).`;

        return { group: [`**/${forbiddenPart}/**`, `**/${forbiddenPart}`], message };
    });
}

const NODE_IMPORT_PATTERN = {
    regex: '^node:',
    message: 'node: imports run only in tests/ and the config files, never in src/.',
};

const BOX2D_PATTERN = {
    regex: '^box2d3-wasm(?!/compat$)(?:/.*)?$',
    message:
        'Import box2d3-wasm/compat only: the default import may pick a different build per computer, which breaks determinism.',
};

function buildImportRule(part: Part, extraLibraries: string[]): Linter.RuleEntry {
    const patterns = [
        ...buildPartPatterns(part),
        ...buildLibraryPattern(part, extraLibraries),
        NODE_IMPORT_PATTERN,
        BOX2D_PATTERN,
    ];

    return ['error', { patterns }];
}

const STYLE_SYNTAX = [
    {
        selector: 'ExportDefaultDeclaration',
        message: 'Use a named export, never export default.',
    },
    {
        selector:
            'IfStatement[consequent.type!="BlockStatement"][consequent.type!="ReturnStatement"][consequent.type!="ContinueStatement"][consequent.type!="BreakStatement"][consequent.type!="ThrowStatement"]',
        message: 'Braces on every if, except a one-line early exit (return, continue, break, throw).',
    },
    {
        selector: 'IfStatement[alternate][alternate.type!="BlockStatement"][alternate.type!="IfStatement"]',
        message: 'Braces on every else.',
    },
    {
        selector:
            ':matches(ForStatement, ForOfStatement, ForInStatement, WhileStatement, DoWhileStatement) > :not(BlockStatement).body',
        message: 'Braces on every loop.',
    },
];

const CORE_SYNTAX = [
    {
        selector: 'BinaryExpression[operator="**"], AssignmentExpression[operator="**="]',
        message:
            '** is Math.pow written another way, which a browser may approximate. Multiply, or use DeterministicMath.',
    },
    {
        selector: 'ForInStatement',
        message:
            'for ... in orders numeric and text keys differently from the order they were added. Use for ... of over a known order.',
    },
];

function buildMathRestrictions(names: string[], reason: string) {
    return names.map((name) => ({ object: 'Math', property: name, message: `Math.${name}: ${reason}` }));
}

const CORE_PROPERTIES = [
    ...buildMathRestrictions(BANNED_MATH_IN_CORE, 'not deterministic across browsers. Use DeterministicMath.'),
    ...LOCALE_METHODS.map((name) => ({
        property: name,
        message: `${name} follows the computer's language, which breaks determinism.`,
    })),
];

const EDITOR_PROPERTIES = buildMathRestrictions(['random'], 'use the seeded random, never Math.random.');

const CORE_GLOBALS = [
    { name: 'Date', message: "Date breaks determinism. The clock time comes in with the run's start." },
    { name: 'Intl', message: "Intl follows the computer's language, which breaks determinism." },
];

const EDITOR_GLOBALS = [{ name: 'Date', message: 'Use the Clock contract, never Date.' }];

function buildPartBlocks(part: Part): Linter.Config[] {
    const isCore = part.name === 'core';
    const isEditor = part.name === 'editor';

    const syntax = isCore ? [...STYLE_SYNTAX, ...CORE_SYNTAX] : STYLE_SYNTAX;

    let properties: typeof CORE_PROPERTIES = [];
    if (isCore) properties = CORE_PROPERTIES;
    if (isEditor) properties = EDITOR_PROPERTIES;

    let globals: typeof CORE_GLOBALS = [];
    if (isCore) globals = CORE_GLOBALS;
    if (isEditor) globals = EDITOR_GLOBALS;

    const codeBlock = {
        name: `engine-v3/${part.name}`,
        files: [`${part.folder}/**`],
        rules: {
            'no-restricted-imports': buildImportRule(part, []),
            'no-restricted-syntax': ['error', ...syntax],
            'no-restricted-properties': ['error', ...properties],
            'no-restricted-globals': ['error', ...globals],
        },
    };

    const testBlock = {
        name: `engine-v3/${part.name}/tests`,
        files: [`${part.folder}/**/*.test.ts`, `${part.folder}/**/*.test.tsx`],
        rules: {
            'no-restricted-imports': buildImportRule(part, LIBRARIES_TESTS_MAY_ALSO_IMPORT),
        },
    };

    return [codeBlock, testBlock];
}

export default defineConfig(
    globalIgnores(['dist/', 'docs/', 'tools/*.js', 'node_modules/', 'test-results/', 'playwright-report/']),
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        name: 'engine-v3/types',
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        name: 'engine-v3/react',
        files: ['src/ui/**', 'src/app/**'],
        extends: [reactHooks.configs.flat['recommended-latest']],
    },
    {
        name: 'engine-v3/style',
        rules: {
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            'no-nested-ternary': 'error',
            'max-depth': ['error', 3],
            curly: ['error', 'multi-line', 'consistent'],
            'no-restricted-syntax': ['error', ...STYLE_SYNTAX],
        },
    },
    PARTS.flatMap(buildPartBlocks),
    {
        name: 'engine-v3/config-files',
        files: ['*.config.ts'],
        rules: {
            'no-restricted-syntax': 'off',
        },
    },
);

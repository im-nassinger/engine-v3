import { afterEach, describe, expect, test } from 'vitest';
import './theme.css';

// Every token of docs/design/tokens.md with its value there. Each token is put on a CSS property beside
// the value written out, and the browser's computed results must match, so each browser's own way of
// writing a colour or a shadow doesn't matter.
const COLOURS: readonly (readonly [string, string])[] = [
    ['--app', '#0d0f13'],
    ['--panel', 'rgba(24,27,33,.96)'],
    ['--raised', 'rgba(255,255,255,.04)'],
    ['--field', 'rgba(255,255,255,.055)'],
    ['--hover', 'rgba(255,255,255,.065)'],
    ['--text', '#e4e8ef'],
    ['--muted', '#8b93a1'],
    ['--faint', '#586070'],
    ['--accent', '#4f8cff'],
    ['--accent-soft', 'rgba(79,140,255,.2)'],
    ['--accent-text', '#8fb5ff'],
    ['--on-accent', '#ffffff'],
    ['--warning', '#e5b931'],
    ['--tip', '#5aa9f0'],
    ['--danger', '#e5534b'],
    ['--playing', '#3fb27f'],
    ['--paused', '#e5b931'],
    ['--tooltip', '#0b0d10'],
    ['--tooltip-text', '#e8ebf0'],
    ['--chip', 'rgba(13,15,19,.8)'],
    ['--scrim', 'rgba(0,0,0,.5)'],
];

const WIDTHS: readonly (readonly [string, string])[] = [
    ['--text-tiny', '10px'],
    ['--text-size', '12px'],
    ['--text-title', '14px'],
    ['--text-large', '16px'],
    ['--text-end-title', '20px'],
    ['--island-gap', '10px'],
    ['--island-bar', '48px'],
    ['--tool', '34px'],
    ['--entity-inspector', '300px'],
    ['--entities-viewer', '260px'],
    ['--minimap', '180px'],
    ['--minimap-height', '93px'],
    ['--debug-box', '28px'],
    ['--row', '30px'],
    ['--panel-head', '40px'],
    ['--card-head', '32px'],
    ['--control', '28px'],
    ['--input', '24px'],
    ['--label', '120px'],
    ['--icon', '16px'],
    ['--icon-small', '13px'],
    ['--indent', '16px'],
    ['--dialog', '400px'],
    ['--end-window', '320px'],
    ['--shortcut-sheet', '320px'],
    ['--space-4', '4px'],
    ['--space-6', '6px'],
    ['--space-8', '8px'],
    ['--space-10', '10px'],
    ['--space-14', '14px'],
    ['--inset', '14px'],
];

const CORNERS: readonly (readonly [string, string])[] = [
    ['--radius', '8px'],
    ['--radius-menu', '12px'],
    ['--radius-island', '14px'],
    ['--radius-tool', '7px'],
];

const WEIGHTS: readonly (readonly [string, string])[] = [
    ['--weight-text', '400'],
    ['--weight-name', '500'],
    ['--weight-heading', '600'],
];

const STACKING: readonly (readonly [string, string])[] = [
    ['--stack-floating', '10'],
    ['--stack-popup', '20'],
    ['--stack-tooltip', '30'],
    ['--stack-dialog', '40'],
];

const probes: HTMLElement[] = [];

afterEach(() => {
    for (const probe of probes.splice(0)) {
        probe.remove();
    }
});

function computed(property: string, value: string) {
    const probe = document.createElement('div');
    probe.style.setProperty(property, value);
    probe.style.position = 'relative';
    document.body.append(probe);
    probes.push(probe);

    return getComputedStyle(probe).getPropertyValue(property);
}

function expectToken(property: string, token: string, value: string) {
    expect(computed(property, `var(${token})`)).toBe(computed(property, value));
}

describe('the theme', () => {
    test.each(COLOURS)('gives %s its colour', (token, value) => {
        expectToken('color', token, value);
    });

    test.each(WIDTHS)('gives %s its size', (token, value) => {
        expectToken('width', token, value);
    });

    test.each(CORNERS)('gives %s its corner', (token, value) => {
        expectToken('border-top-left-radius', token, value);
    });

    test.each(WEIGHTS)('gives %s its weight', (token, value) => {
        expectToken('font-weight', token, value);
    });

    test.each(STACKING)('gives %s its place in the stacking order', (token, value) => {
        expectToken('z-index', token, value);
    });

    test('gives --shade the one soft shadow', () => {
        expectToken('box-shadow', '--shade', '0 2px 5px rgba(0,0,0,.3)');
    });

    test('gives --font JetBrains Mono', () => {
        expectToken('font-family', '--font', '"JetBrains Mono", ui-monospace, monospace');
    });

    test('draws the page in the app colour, the text colour and the font', () => {
        const page = getComputedStyle(document.body);

        expect(page.backgroundColor).toBe(computed('color', '#0d0f13'));
        expect(page.color).toBe(computed('color', '#e4e8ef'));
        expect(page.fontSize).toBe('12px');
    });
});

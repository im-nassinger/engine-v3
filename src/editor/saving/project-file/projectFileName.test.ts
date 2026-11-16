import { describe, expect, test } from 'vitest';

import { projectFileName } from './projectFileName.ts';

describe('projectFileName', () => {
    test('is the level name with the extension', () => {
        expect(projectFileName('castle')).toBe('castle.editable');
        expect(projectFileName('Untitled level')).toBe('Untitled level.editable');
    });

    test('replaces each character no file system allows with _', () => {
        expect(projectFileName('A/B: C?')).toBe('A_B_ C_.editable');
        expect(projectFileName('a\\b*c"d<e>f|g')).toBe('a_b_c_d_e_f_g.editable');
        expect(projectFileName('tab\there')).toBe('tab_here.editable');
    });

    test('trims spaces and dots from both ends', () => {
        expect(projectFileName(' .castle. ')).toBe('castle.editable');
        expect(projectFileName('v1.2 level')).toBe('v1.2 level.editable');
    });

    test('gives level when nothing is left', () => {
        expect(projectFileName('...')).toBe('level.editable');
        expect(projectFileName('')).toBe('level.editable');
    });
});

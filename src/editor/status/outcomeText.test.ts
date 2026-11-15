import { describe, expect, test } from 'vitest';

import { outcomeText } from './outcomeText.ts';

describe('outcomeText', () => {
    test('a refusal reads as its own reason', () => {
        const text = outcomeText({ kind: 'refused', reason: 'The camera can’t be deleted' });

        expect(text).toBe('The camera can’t be deleted');
    });

    test('a done command with nothing to say has no text', () => {
        expect(outcomeText({ kind: 'done' })).toBeUndefined();
        expect(outcomeText({ kind: 'done', skipped: [] })).toBeUndefined();
    });

    test('says what it did', () => {
        const text = outcomeText({ kind: 'done', text: 'Undid: Delete Square' });

        expect(text).toBe('Undid: Delete Square');
    });

    test('says which of the World and the camera were kept', () => {
        const camera = { id: 2, kind: 'camera' } as const;
        const world = { id: 1, kind: 'world' } as const;

        expect(outcomeText({ kind: 'done', skipped: [camera] })).toBe('Camera kept');
        expect(outcomeText({ kind: 'done', skipped: [world] })).toBe('World kept');
        expect(outcomeText({ kind: 'done', skipped: [camera, world] })).toBe('World and camera kept');
    });

    test('says what it did and what it kept', () => {
        const camera = { id: 2, kind: 'camera' } as const;
        const text = outcomeText({ kind: 'done', text: 'Undid: Hide Square', skipped: [camera] });

        expect(text).toBe('Undid: Hide Square. Camera kept');
    });
});

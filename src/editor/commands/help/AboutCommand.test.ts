import { describe, expect, test } from 'vitest';

import { AboutCommand } from './AboutCommand.ts';

describe('AboutCommand', () => {
    test('is always available, in the Help menu, with no shortcut', () => {
        const about = new AboutCommand();

        expect(about.availability()).toEqual({ enabled: true });
        expect(about.menu.menu).toBe('Help');
        expect(about.shortcuts).toEqual([]);
    });

    test('gives a notice naming the game, its file format version and its physics version', () => {
        const outcome = new AboutCommand().run();
        if (outcome.kind !== 'notice') throw new Error('About gave no notice.');

        expect(outcome.notice.title).toBe('About engine-v3');
        expect(outcome.notice.text).toBe('engine-v3\nLevel file format version 2\nPhysics version 1 (Box2D 3.2)');
    });
});

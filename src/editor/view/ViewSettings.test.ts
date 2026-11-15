import { describe, expect, test } from 'vitest';

import { ViewSettings } from './ViewSettings.ts';

describe('ViewSettings', () => {
    test('starts with the grid, joint icons and camera frame on, and the physics view off', () => {
        const settings = new ViewSettings();

        expect(settings.all()).toEqual({ grid: true, jointIcons: true, cameraFrame: true, physicsView: false });
    });

    test('starts from given switches, without sharing them', () => {
        const given = { grid: false, jointIcons: false, cameraFrame: true, physicsView: true };
        const settings = new ViewSettings(given);

        settings.set('grid', true);

        expect(given.grid).toBe(false);
        expect(settings.isOn('physicsView')).toBe(true);
    });

    test('toggling flips one switch', () => {
        const settings = new ViewSettings();

        settings.toggle('physicsView');
        settings.toggle('grid');

        expect(settings.isOn('physicsView')).toBe(true);
        expect(settings.isOn('grid')).toBe(false);
        expect(settings.isOn('jointIcons')).toBe(true);
    });

    test('the version moves only on a real change', () => {
        const settings = new ViewSettings();
        let notified = 0;
        settings.version.subscribe(() => {
            notified += 1;
        });

        settings.set('grid', true);
        expect(notified).toBe(0);

        settings.set('grid', false);
        settings.toggle('cameraFrame');
        expect(notified).toBe(2);
    });

    test('all() is a copy', () => {
        const settings = new ViewSettings();
        const switches = settings.all();

        settings.set('grid', false);

        expect(switches.grid).toBe(true);
    });
});

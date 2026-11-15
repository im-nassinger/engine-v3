import { describe, expect, test } from 'vitest';

import { NameComponent } from '../../core/components/index.ts';
import { Level } from '../../core/level/index.ts';

import { selectionSummary } from './selectionSummary.ts';

describe('selectionSummary', () => {
    test('shows nothing with nothing selected', () => {
        expect(selectionSummary([])).toBe('');
    });

    test('names one entity, or reads Entity when it has no name', () => {
        const level = Level.createNew();
        const square = level.createEntity(level.world, 0);
        square.addComponent(new NameComponent({ name: 'Square' }));
        const unnamed = level.createEntity(level.world, 0);

        expect(selectionSummary([square])).toBe('Selected: Square');
        expect(selectionSummary([unnamed])).toBe('Selected: Entity');
    });

    test('counts several', () => {
        const level = Level.createNew();
        const first = level.createEntity(level.world, 0);
        const second = level.createEntity(level.world, 0);

        expect(selectionSummary([first, second, level.camera])).toBe('Selected: 3 entities');
    });
});

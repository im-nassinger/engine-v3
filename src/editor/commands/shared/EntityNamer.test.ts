import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { EntityNamer } from './EntityNamer.ts';

function addNamed(level: Level, name: string) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));
}

describe('EntityNamer', () => {
    test('starts at 1 when the word was never used', () => {
        const level = Level.createNew();

        expect(new EntityNamer(level).nextName('Group')).toBe('Group 1');
    });

    test('gives one more than the highest number used with the word, ignoring other names', () => {
        const level = Level.createNew();
        addNamed(level, 'Group 2');
        addNamed(level, 'Group 7');
        addNamed(level, 'Group seven');
        addNamed(level, 'Groups 9');
        addNamed(level, 'Group 12b');

        expect(new EntityNamer(level).nextName('Group')).toBe('Group 8');
    });

    test('counts names at any depth', () => {
        const level = Level.createNew();
        const outer = level.createEntity(level.world, 0);
        outer.addComponent(new TransformComponent());
        const inner = level.createEntity(outer, 0);
        inner.addComponent(new NameComponent({ name: 'Group 4' }));

        expect(new EntityNamer(level).nextName('Group')).toBe('Group 5');
    });
});

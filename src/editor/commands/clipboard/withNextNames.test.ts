import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import { withNextNames } from './withNextNames.ts';

const NAME_TYPE_NAME = NameComponent.schema.typeName;

function addNamed(level: Level, name: string) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));
}

function copiedEntity(name: string, children: readonly unknown[] = []) {
    return { id: 1, hidden: false, locked: false, components: { [NAME_TYPE_NAME]: { name } }, children };
}

function nameOf(raw: unknown) {
    const entity = raw as ReturnType<typeof copiedEntity>;

    return entity.components[NAME_TYPE_NAME]?.name;
}

describe('withNextNames', () => {
    test('gives a word and a number the next number for that word in the level', () => {
        const level = Level.createNew();
        addNamed(level, 'Entity 1');

        const [copy] = withNextNames([copiedEntity('Entity 1')], level);

        expect(nameOf(copy)).toBe('Entity 2');
    });

    test('counts the names it gives, parents first, nested entities included', () => {
        const level = Level.createNew();
        addNamed(level, 'Box 1');
        addNamed(level, 'Box 2');
        addNamed(level, 'Group 1');
        const group = copiedEntity('Group 1', [copiedEntity('Box 1'), copiedEntity('Box 2')]);

        const [copy] = withNextNames([group], level);

        const children = (copy as ReturnType<typeof copiedEntity>).children;
        expect(nameOf(copy)).toBe('Group 2');
        expect(children.map(nameOf)).toEqual(['Box 3', 'Box 4']);
    });

    test('leaves a name without a number, and data not shaped as an entity, as they are', () => {
        const level = Level.createNew();
        const crate = copiedEntity('Crate');

        const copies = withNextNames([crate, 'not an entity'], level);

        expect(copies).toEqual([crate, 'not an entity']);
    });
});

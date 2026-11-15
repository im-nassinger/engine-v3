import { describe, expect, test } from 'vitest';

import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { MIXED } from '../model/MIXED.ts';

import { EntityChoices } from './EntityChoices.ts';

function addNamed(level: Level, name: string, parent: Entity = level.world) {
    const entity = level.createEntity(parent, 0);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

function namesOf(entities: readonly Entity[]) {
    return entities.map((entity) => entity.requireComponent(NameComponent).get('name'));
}

describe('EntityChoices', () => {
    test('lists the entities in panel order, without the own ones, the World or the camera', () => {
        const level = Level.createNew();
        const car = addNamed(level, 'Car');
        addNamed(level, 'Wheel', car);
        const player = addNamed(level, 'Player');

        const choices = EntityChoices.matching(level, [player.id], '');

        expect(namesOf(choices)).toEqual(['Car', 'Wheel']);
    });

    test('keeps those whose name holds the search, in any case, up to the first 50', () => {
        const level = Level.createNew();
        for (let i = 0; i < 60; i++) {
            addNamed(level, `Crate ${i}`);
        }
        addNamed(level, 'Player');

        expect(namesOf(EntityChoices.matching(level, [], 'PLAY'))).toEqual(['Player']);
        expect(EntityChoices.matching(level, [], 'crate')).toHaveLength(50);
    });

    test('a dropped row is refused when it is the World, the camera or the field own entity', () => {
        const level = Level.createNew();
        const crate = addNamed(level, 'Crate');
        const other = addNamed(level, 'Other');

        expect(EntityChoices.refusal(level, [crate.id], level.world.id)).toBe("The World can't be picked");
        expect(EntityChoices.refusal(level, [crate.id], level.camera.id)).toBe("The camera can't be picked");
        expect(EntityChoices.refusal(level, [crate.id], crate.id)).toBe("An entity can't point at itself");
        expect(EntityChoices.refusal(level, [crate.id], other.id)).toBeUndefined();
    });

    test('shows the target name, None, Mixed, or missing entity once it is deleted', () => {
        const level = Level.createNew();
        const crate = addNamed(level, 'Crate');

        expect(EntityChoices.shown(level, crate.id)).toEqual({ kind: 'entity', text: 'Crate', entityId: crate.id });
        expect(EntityChoices.shown(level, null).text).toBe('None');
        expect(EntityChoices.shown(level, MIXED).text).toBe('Mixed');

        level.removeEntity(crate);

        expect(EntityChoices.shown(level, crate.id).text).toBe('missing entity');
    });
});

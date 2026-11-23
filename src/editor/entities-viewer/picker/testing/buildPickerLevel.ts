import { NameComponent } from '../../../../core/components/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';

// World > house > (door, window), coin, then the camera, last as in a new level.
export function buildPickerLevel() {
    const level = Level.createNew();
    const coin = named(level.createEntity(level.world, 0), 'coin');
    const house = named(level.createEntity(level.world, 0), 'house');
    const window = named(level.createEntity(house, 0), 'window');
    const door = named(level.createEntity(house, 0), 'door');

    return { level, house, door, window, coin };
}

function named(entity: Entity, name: string) {
    entity.addComponent(new NameComponent({ name }));

    return entity;
}

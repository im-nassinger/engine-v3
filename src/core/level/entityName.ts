import { NameComponent } from '../components/index.ts';

import type { Entity } from './Entity.ts';

export function entityName(entity: Entity) {
    const nameComponent = entity.requireComponent(NameComponent);

    return nameComponent.get('name');
}

// A name missing from the entity reads as its default, as it does in a file.
export function labelName(entity: Entity) {
    const nameComponent = entity.getComponent(NameComponent);
    if (nameComponent === undefined) return 'Entity';

    return nameComponent.get('name');
}

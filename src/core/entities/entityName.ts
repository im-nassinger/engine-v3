import { NameComponent } from '../components/index.ts';

import type { Entity } from './Entity.ts';

export function entityName(entity: Entity) {
    const nameComponent = entity.requireComponent(NameComponent);

    return nameComponent.get('name');
}

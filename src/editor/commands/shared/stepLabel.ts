import { NameComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

// A name missing from the entity reads as its default, as it does in a file.
export function labelName(entity: Entity) {
    const nameComponent = entity.getComponent(NameComponent);
    if (nameComponent === undefined) return 'Entity';

    return nameComponent.get('name');
}

// Names the entity when there is one and counts otherwise: "Delete Square", "Delete 3 entities".
export function stepLabel(verb: string, entities: readonly Entity[]) {
    const onlyEntity = entities.length === 1 ? entities[0] : undefined;
    if (onlyEntity !== undefined) return `${verb} ${labelName(onlyEntity)}`;

    return `${verb} ${entities.length} entities`;
}

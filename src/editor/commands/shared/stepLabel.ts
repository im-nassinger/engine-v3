import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';

// Names the entity when there is one and counts otherwise: "Delete Square", "Delete 3 entities".
export function stepLabel(verb: string, entities: readonly Entity[]) {
    const onlyEntity = entities.length === 1 ? entities[0] : undefined;
    if (onlyEntity !== undefined) return `${verb} ${labelName(onlyEntity)}`;

    return `${verb} ${entities.length} entities`;
}

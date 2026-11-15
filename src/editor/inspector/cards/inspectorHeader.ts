import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import { AVAILABLE, unavailable } from '../model/Availability.ts';
import type { InspectorHeader } from '../model/InspectorHeader.ts';
import { isWorld } from '../rules/componentRules.ts';

import { sameOrMixed } from './componentValues.ts';

export function inspectorHeader(entities: readonly Entity[]): InspectorHeader {
    const hiddenSwitches = entities.map((entity) => entity.isHidden);
    const isHidden = sameOrMixed(hiddenSwitches, (first, second) => first === second);

    const onlyEntity = entities.length === 1 ? entities[0] : undefined;
    if (onlyEntity === undefined) {
        const title = `${entities.length} entities`;
        const canRename = unavailable('Select one entity to rename');

        return { title, entity: undefined, canRename, isHidden };
    }

    let canRename = AVAILABLE;
    if (isWorld(onlyEntity)) {
        canRename = unavailable("The World can't be renamed");
    }

    const title = labelName(onlyEntity);

    return { title, entity: onlyEntity, canRename, isHidden };
}

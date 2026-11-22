import { TagsComponent } from '../../components/index.ts';
import type { Target } from '../../fields/index.ts';
import type { Entity } from '../../level/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import type { TriggerFiring } from '../triggers/TriggerFiring.ts';

// The entities a check or an action is about, in Entities viewer order: the trigger's own, the one that
// caused the event, one by its id, or every entity holding the tag itself. An entity no longer in the run,
// or a tag nobody holds, gives none.
export function targetsOf(target: Target, firing: TriggerFiring, run: PlayRun): readonly Entity[] {
    switch (target.kind) {
        case 'this':
            return [firing.owner];
        case 'other':
            return found(firing.other === null ? undefined : run.level.findEntity(firing.other));
        case 'entity':
            return found(target.entity === null ? undefined : run.level.findEntity(target.entity));
        case 'tagged':
            return target.tag === null ? [] : taggedWith(target.tag, run);
    }
}

function found(entity: Entity | undefined) {
    return entity === undefined ? [] : [entity];
}

function taggedWith(tag: string, run: PlayRun) {
    if (run.triggers.tags.count(tag) === 0) return [];

    const tagged: Entity[] = [];
    for (const entity of run.level.entitiesInPanelOrder()) {
        if (ownTagsOf(entity).includes(tag)) {
            tagged.push(entity);
        }
    }

    return tagged;
}

export function ownTagsOf(entity: Entity) {
    return entity.getComponent(TagsComponent)?.get('tags') ?? [];
}

import type { Target } from '../../../core/fields/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Level } from '../../../core/level/index.ts';

// What a target reads as: "this", "other", an entity's name, "missing entity", "every coin"; null while
// unset.
export function targetText(target: Target, level: Level) {
    switch (target.kind) {
        case 'this':
        case 'other':
            return target.kind;
        case 'tagged':
            if (target.tag === null) return null;

            return `every ${target.tag}`;
        case 'entity': {
            if (target.entity === null) return null;

            const entity = level.findEntity(target.entity);
            if (entity === undefined) return 'missing entity';

            return labelName(entity);
        }
    }
}

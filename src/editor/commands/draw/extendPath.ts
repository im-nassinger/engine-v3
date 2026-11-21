import { JointComponent, PathComponent } from '../../../core/components/index.ts';
import type { PathGeometry } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

const LOCKED = 'This group is locked';
const JOINT_PATH = "A Rope's or Spring's path follows its joint";
const NOT_A_PATH = 'Only a path can be drawn on';
const DURING_DRAG = 'Not during a drag';

export type ExtendPathRefusal = { readonly kind: 'refused'; readonly reason: string };

export type ExtendPathOutcome = { readonly kind: 'extended' } | ExtendPathRefusal;

// Why the pen can't continue this path, or undefined when it can: a Rope's or Spring's path follows its
// joint's ends, and a locked path, or one in a locked group, takes no change.
export function extendRefusal(openLevel: OpenLevel, entity: Entity): ExtendPathRefusal | undefined {
    if (openLevel.editor.isReadOnly) return { kind: 'refused', reason: READ_ONLY_REASON };
    if (openLevel.liveEdit.isActive) return { kind: 'refused', reason: DURING_DRAG };
    if (!entity.hasComponent(PathComponent)) return { kind: 'refused', reason: NOT_A_PATH };
    if (entity.hasComponent(JointComponent)) return { kind: 'refused', reason: JOINT_PATH };
    if (openLevel.caches.hidden.isLocked(entity)) return { kind: 'refused', reason: LOCKED };

    return undefined;
}

// Finishing the pen's drawing on an open path it continued: the whole path, given in its own space, is
// written through LiveEdit's commit as one step "Draw on Path 1". The path keeps its TransformComponent,
// so its points stay where they were. A path as it already was makes no step.
export function extendPath(openLevel: OpenLevel, entity: Entity, path: PathGeometry): ExtendPathOutcome {
    const refusal = extendRefusal(openLevel, entity);
    if (refusal !== undefined) return refusal;

    const { liveEdit } = openLevel;
    const target = { entityId: entity.id, schema: PathComponent.schema, key: 'path' };
    if (!liveEdit.begin([target])) return { kind: 'refused', reason: READ_ONLY_REASON };

    const written = liveEdit.update(target, path);
    if (!written.ok) {
        liveEdit.cancel();
        return { kind: 'refused', reason: 'This path can’t hold these points' };
    }

    const name = labelName(entity);
    liveEdit.commit(`Draw on ${name}`);

    return { kind: 'extended' };
}

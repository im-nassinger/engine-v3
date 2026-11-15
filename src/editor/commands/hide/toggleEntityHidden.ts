import type { EntityId } from '../../../core/level/index.ts';
import { SetSwitchChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { stepLabel } from '../shared/stepLabel.ts';

// A row's eye: hides or shows that one entity, never the selection, in one step. The World has no eye.
export function toggleEntityHidden(openLevel: OpenLevel, entityId: EntityId): EditOutcome {
    const { level, editor } = openLevel;
    const entity = level.requireEntity(entityId);
    if (entity === level.world) return { kind: 'refused', reason: "The World can't be hidden" };

    const willHide = !entity.isHidden;
    const verb = willHide ? 'Hide' : 'Show';
    const label = stepLabel(verb, [entity]);
    const change = new SetSwitchChange(entityId, 'hidden', entity.isHidden, willHide);

    return editor.edit(label, (transaction) => {
        transaction.apply(change);
        return { kind: 'done' };
    });
}

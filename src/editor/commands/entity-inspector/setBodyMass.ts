import { SurfaceComponent } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { densitiesForMass } from '../../../core/physics/index.ts';
import { SetValueChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// The Entity inspector's Mass typed on every given body, as one step labelled "Change Mass". Mass isn't
// stored, so each body's surfaces get the densities that give it this mass (owner, 2026-11-19): bodies of
// different sizes get different densities. A mass any body can't have gives the reason and no step.
export function setBodyMass(openLevel: OpenLevel, entityIds: readonly EntityId[], mass: number): EditOutcome {
    const { level, editor, caches } = openLevel;
    const changes: SetValueChange[] = [];

    for (const id of entityIds) {
        const body = level.requireEntity(id);
        const outcome = densitiesForMass(body, mass, caches);
        if (!outcome.ok) {
            if (outcome.reason === 'noArea') return { kind: 'refused', reason: 'Mass needs a shape with an area' };

            return { kind: 'refused', reason: `That mass needs a density above ${outcome.maxDensity}` };
        }

        for (const { entity, density } of outcome.densities) {
            const oldValue = entity.requireComponent(SurfaceComponent).get('density');
            if (oldValue === density) continue;

            const schema = SurfaceComponent.schema;
            changes.push(
                new SetValueChange({ entityId: entity.id, schema, key: 'density', oldValue, newValue: density }),
            );
        }
    }

    if (changes.length === 0) return { kind: 'done' };

    return editor.edit('Change Mass', (transaction) => {
        for (const change of changes) {
            transaction.apply(change);
        }

        return { kind: 'done' };
    });
}

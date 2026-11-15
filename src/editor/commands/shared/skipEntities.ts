import type { Entity, Level } from '../../../core/level/index.ts';
import type { SkippedEntity } from '../../history/index.ts';

export type SkippedKind = SkippedEntity['kind'];

export type SkipResult = {
    readonly allowed: readonly Entity[];
    readonly skipped: readonly SkippedEntity[];
};

// The skip rule: a command leaves out the World or the camera when it doesn't allow them, and reports them.
export function skipEntities(level: Level, entities: readonly Entity[], skippedKinds: readonly SkippedKind[]) {
    const allowed: Entity[] = [];
    const skipped: SkippedEntity[] = [];

    for (const entity of entities) {
        const kind = specialKindOf(level, entity);
        const isSkipped = kind !== undefined && skippedKinds.includes(kind);

        if (isSkipped) {
            skipped.push({ id: entity.id, kind });
        } else {
            allowed.push(entity);
        }
    }

    const result: SkipResult = { allowed, skipped };
    return result;
}

function specialKindOf(level: Level, entity: Entity): SkippedKind | undefined {
    if (entity === level.world) return 'world';
    if (entity === level.camera) return 'camera';

    return undefined;
}

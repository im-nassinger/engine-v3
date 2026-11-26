import { SurfaceComponent } from '../../../core/components/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { BodyMass, densitiesOfSurfaces } from '../../../core/physics/index.ts';
import type { BodySurface } from '../../../core/physics/index.ts';
import type { ValueTarget } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import type { SlideOutcome } from './FieldSlide.ts';
import { setBodyMass } from './setBodyMass.ts';

// The bodies whose Mass a slider drags.
export type SlidBodies = {
    readonly openLevel: OpenLevel;
    readonly entityIds: readonly EntityId[];
};

// The Entity inspector's Mass while dragged, as FieldSlide drags a stored field: each move sets the
// densities of every shown body's surfaces through LiveEdit, from the densities the drag began with, so
// their ratios survive passing through 0. The release makes one step, "Change Mass", as typing it would. A
// mass a body can't have leaves its densities where they were.
export class MassSlide {
    private readonly slid: SlidBodies;
    private bodies: (readonly BodySurface[])[] = [];
    private isLive = false;

    constructor(slid: SlidBodies) {
        this.slid = slid;
    }

    // The slider gives a number; it takes any value, as FieldSlide does.
    slideTo(mass: unknown) {
        if (typeof mass !== 'number') return;
        if (!this.isLive && !this.begin()) return;

        const { liveEdit } = this.slid.openLevel;
        if (!liveEdit.isActive) return;

        for (const surfaces of this.bodies) {
            const outcome = densitiesOfSurfaces(surfaces, mass);
            if (!outcome.ok) continue;

            for (const { entity, density } of outcome.densities) {
                liveEdit.update(densityOf(entity.id), density);
            }
        }
    }

    release(mass: unknown): SlideOutcome {
        const { openLevel, entityIds } = this.slid;
        if (!this.isLive) {
            if (typeof mass !== 'number') return { kind: 'putBack' };

            return setBodyMass(openLevel, entityIds, mass);
        }

        this.isLive = false;
        const { liveEdit } = openLevel;
        if (!liveEdit.isActive) return { kind: 'putBack' };

        liveEdit.commit('Change Mass');

        return { kind: 'done' };
    }

    // The slider went away mid-drag, so no release will come: the start densities go back.
    cancel() {
        if (!this.isLive) return;

        this.isLive = false;
        this.slid.openLevel.liveEdit.cancel();
    }

    private begin() {
        const { openLevel, entityIds } = this.slid;
        const { liveEdit, level, caches } = openLevel;
        if (liveEdit.isActive) return false;

        this.bodies = entityIds.map((id) => BodyMass.surfacesOf(level.requireEntity(id), caches));
        const targets = this.bodies.flatMap((surfaces) => surfaces.map((surface) => densityOf(surface.entity.id)));
        if (targets.length === 0 || !liveEdit.begin(targets)) return false;
        this.isLive = true;

        return true;
    }
}

function densityOf(entityId: EntityId): ValueTarget {
    return { entityId, schema: SurfaceComponent.schema, key: 'density' };
}

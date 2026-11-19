import { NumberFieldType } from '../../fields/index.ts';
import { SurfaceComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';

import { BodyMass } from './BodyMass.ts';
import type { BodyMassCaches } from './BodyMass.ts';

// One surface of the body and the density it gets.
export type SurfaceDensity = {
    readonly entity: Entity;
    readonly density: number;
};

export type DensitiesForMass =
    | { readonly ok: true; readonly densities: readonly SurfaceDensity[] }
    // A body with no surfaces, or only lines, weighs nothing at any density.
    | { readonly ok: false; readonly reason: 'noArea' }
    // The mass needs a density past Density's limit on at least one surface.
    | { readonly ok: false; readonly reason: 'tooDense'; readonly maxDensity: number };

// The densities that give a body this mass, since mass is never stored: mass = area × density. The
// surfaces keep their densities' ratios, so a body with one density everywhere gets one new density.
// When every density is 0 there are no ratios to keep, so they all get the same one.
export function densitiesForMass(body: Entity, mass: number, caches: BodyMassCaches): DensitiesForMass {
    const surfaces = BodyMass.surfacesOf(body, caches);
    const massAtDensityOne = sum(surfaces.map((surface) => surface.massAtDensityOne));
    if (massAtDensityOne === 0) return { ok: false, reason: 'noArea' };

    const currentMass = sum(surfaces.map((surface) => surface.density * surface.massAtDensityOne));
    const densityFor = (density: number) => {
        if (currentMass === 0) return mass / massAtDensityOne;

        return density * (mass / currentMass);
    };

    const densities = surfaces.map((surface) => ({ entity: surface.entity, density: densityFor(surface.density) }));

    const maxDensity = densityLimit();
    const isTooDense = densities.some((surface) => surface.density > maxDensity);
    if (isTooDense) return { ok: false, reason: 'tooDense', maxDensity };

    return { ok: true, densities };
}

function sum(values: readonly number[]) {
    return values.reduce((total, value) => total + value, 0);
}

function densityLimit() {
    const type = SurfaceComponent.schema.findField('density')?.type;
    if (!(type instanceof NumberFieldType)) throw new Error('Density is a number field.');

    return type.max ?? Infinity;
}

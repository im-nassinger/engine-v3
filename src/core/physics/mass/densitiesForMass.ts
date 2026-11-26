import { NumberFieldType } from '../../fields/index.ts';
import { SurfaceComponent } from '../../components/index.ts';
import type { Entity } from '../../level/index.ts';

import { BodyMass } from './BodyMass.ts';
import type { BodyMassCaches, BodySurface } from './BodyMass.ts';

// How far past Density's limit a worked-out density may come from rounding alone.
const ROUNDING_SHARE = 1e-9;

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
    return densitiesOfSurfaces(BodyMass.surfacesOf(body, caches), mass);
}

// The same from surfaces read before, so a dragged Mass keeps the ratios the drag began with even after
// passing through 0.
export function densitiesOfSurfaces(surfaces: readonly BodySurface[], mass: number): DensitiesForMass {
    const massAtDensityOne = sum(surfaces.map((surface) => surface.massAtDensityOne));
    if (massAtDensityOne === 0) return { ok: false, reason: 'noArea' };

    const currentMass = sum(surfaces.map((surface) => surface.density * surface.massAtDensityOne));
    const densityFor = (density: number) => {
        if (currentMass === 0) return mass / massAtDensityOne;

        return density * (mass / currentMass);
    };

    const maxDensity = densityLimit();
    const unclamped = surfaces.map((surface) => densityFor(surface.density));
    const isTooDense = unclamped.some((density) => density > maxDensity * (1 + ROUNDING_SHARE));
    if (isTooDense) return { ok: false, reason: 'tooDense', maxDensity };

    // The heaviest mass can come out a last bit above the limit.
    const densities = surfaces.map((surface, index) => ({
        entity: surface.entity,
        density: Math.min(maxDensity, unclamped[index] as number),
    }));

    return { ok: true, densities };
}

// The heaviest the body can be while keeping its densities' ratios: when its densest surface reaches
// Density's limit. 0 for a body with no area.
export function heaviestMass(body: Entity, caches: BodyMassCaches) {
    const surfaces = BodyMass.surfacesOf(body, caches);
    const massAtDensityOne = sum(surfaces.map((surface) => surface.massAtDensityOne));
    const currentMass = sum(surfaces.map((surface) => surface.density * surface.massAtDensityOne));
    const densest = Math.max(0, ...surfaces.map((surface) => surface.density));
    const maxDensity = densityLimit();
    if (currentMass === 0 || densest === 0) return massAtDensityOne * maxDensity;

    return currentMass * (maxDensity / densest);
}

function sum(values: readonly number[]) {
    return values.reduce((total, value) => total + value, 0);
}

function densityLimit() {
    const type = SurfaceComponent.schema.findField('density')?.type;
    if (!(type instanceof NumberFieldType)) throw new Error('Density is a number field.');

    return type.max ?? Infinity;
}

import { StyleComponent, TransformComponent } from '../components/index.ts';
import type { Entity } from '../level/index.ts';
import { Matrix2D } from '../geometry/index.ts';

// An outline drawn without it is as wide as the StyleComponent's width in the space just outside it.
export type OutlineStretch = {
    // The entity's own scale and skew: what its matrix does after its rotation and position.
    readonly stretch: Matrix2D;
    readonly unstretch: Matrix2D;
};

function isMirrorOrNothing(scale: { readonly x: number; readonly y: number }, skew: number) {
    return Math.abs(scale.x) === 1 && Math.abs(scale.y) === 1 && skew === 0;
}

// The part of an entity's own matrix its outline doesn't follow, when its StyleComponent's Scale outline
// is off: its own scale and skew, never a parent group's (standing yes, 2026-11-17). undefined when the
// outline follows the whole matrix: Scale outline on, no StyleComponent, or a scale that stretches nothing.
// The rotation is left out because it keeps widths, so a body's turning in play changes nothing here.
export function outlineStretchOf(entity: Entity): OutlineStretch | undefined {
    const style = entity.getComponent(StyleComponent);
    if (style === undefined || style.get('scaleOutline')) return undefined;

    const transform = entity.getComponent(TransformComponent);
    if (transform === undefined) return undefined;

    const scale = transform.get('scale');
    const skew = transform.get('skew');
    if (isMirrorOrNothing(scale, skew)) return undefined;

    const stretch = Matrix2D.fromTransform({ position: { x: 0, y: 0 }, rotation: 0, scale, skew });
    // A scale of 0 can't be undone; the editor refuses one, so a level never has it.
    const unstretch = stretch.invert();
    if (unstretch === undefined) return undefined;

    return { stretch, unstretch };
}

// How wide an outline of width 1 is drawn at the level, under the entity's level matrix.
export function outlineScaleOf(entity: Entity, levelMatrix: Matrix2D) {
    const outlineStretch = outlineStretchOf(entity);
    if (outlineStretch === undefined) return levelMatrix.largestStretch();

    return levelMatrix.multiply(outlineStretch.unstretch).largestStretch();
}

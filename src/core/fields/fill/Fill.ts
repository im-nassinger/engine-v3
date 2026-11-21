import type { Point } from '../../geometry/index.ts';

// A place on the gradient bar, 0 to 1, shown as %.
export type ColourStop = { readonly colour: string; readonly place: number };

// The StyleComponent's fill. Start, end and centre are shares of the entity's box, and a radial gradient's
// radius is a share of the box's width along x and of its height along y. None and solid are stored as in v1.
export type Fill =
    | { readonly kind: 'none' }
    | { readonly kind: 'solid'; readonly colour: string }
    | { readonly kind: 'linear'; readonly stops: readonly ColourStop[]; readonly start: Point; readonly end: Point }
    | {
          readonly kind: 'radial';
          readonly stops: readonly ColourStop[];
          readonly centre: Point;
          readonly radius: number;
      };

export type FillKind = Fill['kind'];

export type GradientFill = Extract<Fill, { readonly kind: 'linear' | 'radial' }>;

export const MIN_STOPS = 2;
export const MAX_STOPS = 8;

// A handle may be dragged past the box, so a position may go a little outside 0 to 1.
export const MIN_POSITION = -10;
export const MAX_POSITION = 11;

// The farthest a radius dot can be from a centre, both kept between the limits above.
export const MAX_RADIUS = MAX_POSITION - MIN_POSITION;

// The smallest radius the editor sets, 1%, typed or dragged: a radius of 0 has no circle to show.
export const MIN_EDITED_RADIUS = 0.01;

// v1's default fill colour, which a fill switched on from None starts from.
export const DEFAULT_FILL_COLOUR = '#4A90D9FF';

export function isGradient(fill: Fill): fill is GradientFill {
    return fill.kind === 'linear' || fill.kind === 'radial';
}

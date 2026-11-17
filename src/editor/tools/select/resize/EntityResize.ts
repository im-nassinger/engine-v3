import { ShapeComponent, TransformComponent } from '../../../../core/components/index.ts';
import type { Matrix2D, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';
import { labelName } from '../../../../core/level/index.ts';
import type { ValueTarget } from '../../../history/index.ts';
import type { OpenLevel } from '../../../session/index.ts';
import type { SelectionFrame } from '../frame/SelectionFrame.ts';

import type { Stretch } from './resizeFactor.ts';

// A size never rests below this: the size an entity is drawn at in its parent's pixels, the World's
// rectangle in level pixels.
const MIN_SIDE_PX = 1;
// The World's rectangle stops at LevelLimits' maxLevelSize on each side, as its Width and Height fields do.
const MAX_LEVEL_SIDE_PX = 200_000;

// One entity resized through LiveEdit, which the caller begins with the targets: a shape's or a group's
// scale, and the position that keeps the anchor in place on screen. A shape's values and its outline width
// never change. The World resizes only its rectangle, from its centre, and never moves.
export class EntityResize {
    readonly label: string;
    readonly targets: readonly ValueTarget[];
    private readonly openLevel: OpenLevel;
    private readonly frame: SelectionFrame;
    private readonly parentInverse: Matrix2D | undefined;
    // The World's rectangle before the drag, or the entity's scale.
    private readonly startWorld: ShapeGeometry | undefined;
    private readonly startScale: Point;

    private constructor(openLevel: OpenLevel, frame: SelectionFrame, parentInverse: Matrix2D | undefined) {
        this.openLevel = openLevel;
        this.frame = frame;
        this.parentInverse = parentInverse;
        this.label = `Resize ${labelName(frame.entity)}`;

        const entity = frame.entity;
        this.startWorld = frame.kind === 'world' ? entity.getComponent(ShapeComponent)?.get('geometry') : undefined;
        this.startScale = entity.getComponent(TransformComponent)?.get('scale') ?? { x: 1, y: 1 };
        this.targets = this.targetsOf();
    }

    // undefined when the entity's parent can't be turned around, so nothing could be placed under it.
    static of(openLevel: OpenLevel, frame: SelectionFrame): EntityResize | undefined {
        if (frame.kind === 'world') return new EntityResize(openLevel, frame, undefined);

        const parent = frame.entity.parent;
        if (parent === undefined) return undefined;

        const parentInverse = openLevel.caches.worldMatrices.matrixOf(parent).invert();
        if (parentInverse === undefined) return undefined;

        return new EntityResize(openLevel, frame, parentInverse);
    }

    // A circle stays round: its scale takes the larger stretch on both axes, as if Shift were held.
    get keepsRound() {
        const shape = this.frame.kind === 'shape' ? this.frame.entity.getComponent(ShapeComponent) : undefined;

        return shape?.get('geometry').kind === 'circle';
    }

    // Writes the stretch, each side kept at least 1 px, and gives the size the entity is now drawn at.
    apply(stretch: Stretch): Point {
        const factor = this.atLeastOnePixel(stretch.factor);
        const size = this.sizeBefore();
        const { liveEdit } = this.openLevel;
        const id = this.frame.entity.id;

        if (this.startWorld !== undefined) {
            const target = { entityId: id, schema: ShapeComponent.schema, key: 'geometry' };
            liveEdit.update(target, stretchedRectangle(this.startWorld, factor));
        } else {
            const scale = { x: this.startScale.x * factor.x, y: this.startScale.y * factor.y };
            liveEdit.update({ entityId: id, schema: TransformComponent.schema, key: 'scale' }, scale);
        }

        if (this.parentInverse !== undefined) {
            // The own space stretched around its origin; moving that origin by the shift keeps the anchor put.
            const { anchor } = stretch;
            const shift = { x: anchor.x - anchor.x * factor.x, y: anchor.y - anchor.y * factor.y };
            const position = this.parentInverse.apply(this.frame.matrix.apply(shift));
            liveEdit.update({ entityId: id, schema: TransformComponent.schema, key: 'position' }, position);
        }

        return { x: size.x * Math.abs(factor.x), y: size.y * Math.abs(factor.y) };
    }

    private targetsOf(): ValueTarget[] {
        const entityId = this.frame.entity.id;
        if (this.startWorld !== undefined) return [{ entityId, schema: ShapeComponent.schema, key: 'geometry' }];

        const targets: ValueTarget[] = [{ entityId, schema: TransformComponent.schema, key: 'scale' }];
        if (this.parentInverse !== undefined) {
            targets.push({ entityId, schema: TransformComponent.schema, key: 'position' });
        }

        return targets;
    }

    // The size the entity is drawn at: its box times its scale, the World's rectangle as it is.
    private sizeBefore(): Point {
        const { box } = this.frame;
        if (this.startWorld !== undefined) return { x: box.width, y: box.height };

        return { x: box.width * Math.abs(this.startScale.x), y: box.height * Math.abs(this.startScale.y) };
    }

    // The World's sides also stop at the largest level.
    private atLeastOnePixel(factor: Point): Point {
        const size = this.sizeBefore();
        const atMost = this.frame.kind === 'world' ? MAX_LEVEL_SIDE_PX : Infinity;

        return { x: within(factor.x, size.x, atMost), y: within(factor.y, size.y, atMost) };
    }
}

// A factor that leaves a side of size under 1 px grows it to 1 px, and one past atMost shrinks it to
// atMost, keeping the mirror. A side with no size isn't stretched.
function within(factor: number, size: number, atMost: number) {
    if (size === 0) return 1;

    const smallest = MIN_SIDE_PX / size;
    const largest = atMost / size;
    const length = Math.min(Math.max(Math.abs(factor), smallest), largest);

    return factor < 0 ? -length : length;
}

// The World's rectangle, stretched around its centre. It is always a rectangle; anything else is left as it is.
function stretchedRectangle(geometry: ShapeGeometry, factor: Point): ShapeGeometry {
    if (geometry.kind !== 'rectangle') return geometry;

    return {
        kind: 'rectangle',
        width: Math.abs(geometry.width * factor.x),
        height: Math.abs(geometry.height * factor.y),
    };
}

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../../core/components/index.ts';
import type { Matrix2D, Point, ShapeGeometry } from '../../../../core/geometry/index.ts';
import { labelName } from '../../../../core/level/index.ts';
import type { ValueTarget } from '../../../history/index.ts';
import type { OpenLevel } from '../../../session/index.ts';
import type { SelectionFrame } from '../frame/SelectionFrame.ts';

import type { Stretch } from './resizeFactor.ts';

// A size never rests below this, in the units the Inspector shows: a shape's width and height, a group's
// box in its parent's pixels.
const MIN_SIDE_PX = 1;
// The World's rectangle stops at LevelLimits' maxLevelSize on each side, as its Width and Height fields do.
const MAX_LEVEL_SIDE_PX = 200_000;
// The StyleComponent's Outline width field allows up to this.
const MAX_OUTLINE_WIDTH = 200;

// What the entity held before the drag.
type StartValues = {
    readonly geometry: ShapeGeometry | undefined;
    readonly scale: Point;
    readonly outlineWidth: number | undefined;
};

// One entity resized through LiveEdit, which the caller begins with the targets: a shape's geometry, a
// group's scale, and the position that keeps the anchor in place on screen. The World resizes only its
// rectangle, from its centre, and never moves.
export class EntityResize {
    readonly label: string;
    readonly targets: readonly ValueTarget[];
    private readonly openLevel: OpenLevel;
    private readonly frame: SelectionFrame;
    private readonly parentInverse: Matrix2D | undefined;
    private readonly start: StartValues;

    private constructor(openLevel: OpenLevel, frame: SelectionFrame, parentInverse: Matrix2D | undefined) {
        this.openLevel = openLevel;
        this.frame = frame;
        this.parentInverse = parentInverse;
        this.label = `Resize ${labelName(frame.entity)}`;

        const entity = frame.entity;
        const shape = entity.getComponent(ShapeComponent);
        const style = entity.getComponent(StyleComponent);
        const transform = entity.getComponent(TransformComponent);
        this.start = {
            geometry: frame.kind === 'group' ? undefined : shape?.get('geometry'),
            scale: transform?.get('scale') ?? { x: 1, y: 1 },
            outlineWidth: frame.kind === 'shape' ? style?.get('outlineWidth') : undefined,
        };
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

    // A circle stays round: its radius follows the larger stretch, as if Shift were held.
    get keepsRound() {
        return this.start.geometry?.kind === 'circle';
    }

    // Writes the stretch, each side kept at least 1 px, and gives the new size in the Inspector's units.
    // scalesOutline (Shift) multiplies a shape's outline width by the larger stretch too.
    apply(stretch: Stretch, scalesOutline: boolean): Point {
        const factor = this.atLeastOnePixel(stretch.factor);
        const size = this.sizeBefore();
        const { liveEdit } = this.openLevel;
        const id = this.frame.entity.id;
        const larger = Math.max(Math.abs(factor.x), Math.abs(factor.y));

        if (this.start.geometry !== undefined) {
            const target = { entityId: id, schema: ShapeComponent.schema, key: 'geometry' };
            liveEdit.update(target, stretchedGeometry(this.start.geometry, factor));
        } else {
            const scale = { x: this.start.scale.x * factor.x, y: this.start.scale.y * factor.y };
            liveEdit.update({ entityId: id, schema: TransformComponent.schema, key: 'scale' }, scale);
        }

        if (this.start.outlineWidth !== undefined) {
            const outlineWidth = scalesOutline
                ? Math.min(this.start.outlineWidth * larger, MAX_OUTLINE_WIDTH)
                : this.start.outlineWidth;
            liveEdit.update({ entityId: id, schema: StyleComponent.schema, key: 'outlineWidth' }, outlineWidth);
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
        const targets: ValueTarget[] = [];

        if (this.start.geometry !== undefined) {
            targets.push({ entityId, schema: ShapeComponent.schema, key: 'geometry' });
        } else {
            targets.push({ entityId, schema: TransformComponent.schema, key: 'scale' });
        }
        if (this.start.outlineWidth !== undefined) {
            targets.push({ entityId, schema: StyleComponent.schema, key: 'outlineWidth' });
        }
        if (this.parentInverse !== undefined) {
            targets.push({ entityId, schema: TransformComponent.schema, key: 'position' });
        }

        return targets;
    }

    // A shape's width and height, a group's box times its scale.
    private sizeBefore(): Point {
        const { box } = this.frame;
        const scalesTheGroup = this.start.geometry === undefined;

        return {
            x: box.width * (scalesTheGroup ? Math.abs(this.start.scale.x) : 1),
            y: box.height * (scalesTheGroup ? Math.abs(this.start.scale.y) : 1),
        };
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

// Stretched around the shape's own origin. A rectangle or a circle stays centred, so mirroring changes
// nothing in it; a circle takes the larger stretch, which the drag already made the same on both axes.
function stretchedGeometry(geometry: ShapeGeometry, factor: Point): ShapeGeometry {
    switch (geometry.kind) {
        case 'rectangle':
            return {
                kind: 'rectangle',
                width: Math.abs(geometry.width * factor.x),
                height: Math.abs(geometry.height * factor.y),
            };
        case 'circle':
            return { kind: 'circle', radius: geometry.radius * Math.max(Math.abs(factor.x), Math.abs(factor.y)) };
        case 'polygon':
        case 'line':
            return {
                kind: geometry.kind,
                points: geometry.points.map((point) => ({ x: point.x * factor.x, y: point.y * factor.y })),
            };
    }
}

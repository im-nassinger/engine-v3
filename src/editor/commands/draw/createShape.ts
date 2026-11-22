import { NameComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import type { Point, ShapeGeometry, ShapeKind } from '../../../core/geometry/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import type { OpenLevel } from '../../session/index.ts';

import { addDrawnEntity } from './addDrawnEntity.ts';
import type { DrawnEntityOutcome } from './addDrawnEntity.ts';

const KIND_WORDS: Readonly<Record<ShapeKind, string>> = {
    rectangle: 'Rectangle',
    circle: 'Circle',
    polygon: 'Polygon',
    line: 'Line',
};

// What the Shape tool drew, in the current group's own space: the shape's geometry around its own
// origin, where that origin goes, and how far Z and X turned it, in degrees clockwise.
export type ShapeDrawing = {
    readonly geometry: ShapeGeometry;
    readonly position: Point;
    readonly rotation: number;
};

export type CreateShapeOutcome = DrawnEntityOutcome;

// Finishing a drawing: a new shape with v1's default look, in the current group, on top, named
// "Rectangle 1" and selected, in one step "Draw Rectangle 1", at the drawing's rotation. An edit, not a registered command, since
// only the Shape tool runs it. Refused inside a locked group, or when the group is as deep as a level goes.
export function createShape(openLevel: OpenLevel, reader: LevelReader, drawing: ShapeDrawing): CreateShapeOutcome {
    return addDrawnEntity(openLevel, reader, {
        word: KIND_WORDS[drawing.geometry.kind],
        components: (name) => [
            new TransformComponent({
                position: drawing.position,
                rotation: drawing.rotation,
                scale: { x: 1, y: 1 },
                skew: 0,
            }),
            new NameComponent({ name }),
            new ShapeComponent({ geometry: drawing.geometry }),
            new StyleComponent(),
        ],
    });
}

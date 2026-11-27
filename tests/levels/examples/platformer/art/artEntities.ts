import { PathComponent, StyleComponent, TagsComponent } from '../../../../../src/core/components/index.ts';
import type { Fill } from '../../../../../src/core/fields/index.ts';
import type { PathGeometry, Point } from '../../../../../src/core/geometry/index.ts';
import type { Entity, Level } from '../../../../../src/core/level/index.ts';
import { addEntity, at } from '../../../determinism/build/levelParts.ts';

import type { ArtPart } from './blobArt.ts';

// A drawn shape that never collides: a filled path with no outline.
export function addArtPath(level: Level, parent: Entity, part: ArtPart, opacity = 1, tags: readonly string[] = []) {
    const entity = addEntity(level, parent, part.name);
    entity.addComponent(new PathComponent({ path: part.path }));
    entity.addComponent(
        new StyleComponent({
            fill: part.fill ?? { kind: 'solid', colour: part.colour },
            outlineColour: part.colour,
            outlineWidth: 0,
            scaleOutline: false,
            opacity,
        }),
    );
    if (tags.length > 0) {
        entity.addComponent(new TagsComponent({ tags }));
    }

    return entity;
}

export function addArtGroup(level: Level, parent: Entity, name: string, position: Point, parts: readonly ArtPart[]) {
    const group = addEntity(level, parent, name, at(position.x, position.y));
    for (const part of parts) {
        addArtPath(level, group, part);
    }

    return group;
}

export function part(name: string, path: PathGeometry, colour: string): ArtPart {
    return { name, path, colour };
}

// A part filled with a gradient. `colour` is the gradient's middle colour, kept for the outline.
export function gradientPart(name: string, path: PathGeometry, colour: string, fill: Fill): ArtPart {
    return { name, path, colour, fill };
}

// A gradient from top to bottom of a part's box, with evenly spread colours unless places are given.
export function verticalGradient(colours: readonly string[], places?: readonly number[]): Fill {
    const stops = colours.map((colour, index) => ({ colour, place: places?.[index] ?? index / (colours.length - 1) }));

    return { kind: 'linear', stops, start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
}

// A round glow from a colour in the middle of a part's box to the same colour, see-through, at its edge.
export function glow(colour: string, opacity = 'FF'): Fill {
    const solid = colour.slice(0, 7);
    const stops = [
        { colour: `${solid}${opacity}`, place: 0 },
        { colour: `${solid}00`, place: 1 },
    ];

    return { kind: 'radial', stops, centre: { x: 0.5, y: 0.5 }, radius: 0.5 };
}

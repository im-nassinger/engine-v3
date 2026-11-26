import { PathComponent, StyleComponent, TagsComponent } from '../../../../../src/core/components/index.ts';
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
            fill: { kind: 'solid', colour: part.colour },
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

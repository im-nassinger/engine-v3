import {
    BodyComponent,
    CameraComponent,
    JointComponent,
    ShapeComponent,
    SurfaceComponent,
} from '../../../../core/components/index.ts';
import type { BoundsCache, WorldMatrixCache } from '../../../../core/derived/index.ts';
import { Bounds } from '../../../../core/geometry/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Entity, Level } from '../../../../core/level/index.ts';
import { mergesInto } from '../../../../core/physics/index.ts';

import type { SelectionSource } from './SelectionSource.ts';

// Above this many selected entities only the shared box and a count are drawn.
export const MAX_OUTLINED_ENTITIES = 500;

export type SelectionPlanCaches = {
    readonly bounds: BoundsCache;
    readonly worldMatrices: WorldMatrixCache;
};

// What the selection table asks to draw, in level positions. The overlay turns it into screen pixels.
export type SelectionPlan = {
    // Shapes outlined because they are selected or inside a selected entity.
    readonly outlines: readonly Entity[];
    // One selected shape gets the heavier outline; several get a thin one each.
    readonly heavyOutline: boolean;
    // The other shapes of the bodies the selected entities belong to.
    readonly bodyOutlines: readonly Entity[];
    // The selected joints' positions, each drawn as a ring around its icon.
    readonly rings: readonly Point[];
    // The selected camera's frame, drawn heavier.
    readonly cameraFrames: readonly Bounds[];
    // Where each selected locked entity draws, with a padlock at its top right.
    readonly padlocks: readonly Bounds[];
    // Where the selected entities are when every one of them is hidden.
    readonly hiddenBox: Bounds | undefined;
    // The box shared by several entities, without handles in v1.
    readonly sharedBox: Bounds | undefined;
    // Above MAX_OUTLINED_ENTITIES, the number drawn beside the shared box.
    readonly count: number | undefined;
};

const EMPTY_PLAN: SelectionPlan = {
    outlines: [],
    heavyOutline: false,
    bodyOutlines: [],
    rings: [],
    cameraFrames: [],
    padlocks: [],
    hiddenBox: undefined,
    sharedBox: undefined,
    count: undefined,
};

// Follows the requirement's table of how the selection is drawn. A hidden entity in a selection with
// visible ones draws nothing and stays out of the shared box, since it isn't where the user can see it.
export function planSelection(source: SelectionSource, level: Level, caches: SelectionPlanCaches): SelectionPlan {
    const selected = source.entities;
    if (selected.length === 0) return EMPTY_PLAN;

    const shown = selected.filter((entity) => !source.isHidden(entity));
    if (shown.length === 0) {
        return { ...EMPTY_PLAN, hiddenBox: unionOf(selected, caches, true) };
    }

    if (selected.length > MAX_OUTLINED_ENTITIES) {
        return { ...EMPTY_PLAN, sharedBox: unionOf(shown, caches, false), count: selected.length };
    }

    const isOne = selected.length === 1;
    const outlines: Entity[] = [];
    const rings: Point[] = [];
    const cameraFrames: Bounds[] = [];
    const padlocks: Bounds[] = [];

    for (const entity of shown) {
        if (entity === level.world) continue;

        if (entity.hasComponent(JointComponent)) {
            const matrix = caches.worldMatrices.matrixOf(entity);
            rings.push({ x: matrix.tx, y: matrix.ty });
            continue;
        }

        if (entity.hasComponent(CameraComponent)) {
            const frame = caches.bounds.ownBoundsOf(entity);
            if (frame !== undefined) {
                cameraFrames.push(frame);
            }
            continue;
        }

        const isLocked = source.isLocked(entity);
        // One group is drawn as its box alone, unless it is locked and so has no box.
        const isLoneGroup = isOne && !entity.hasComponent(ShapeComponent) && !isLocked;
        if (!isLoneGroup) {
            collectShapes(entity, source, outlines);
        }

        const drawn = caches.bounds.subtreeBoundsOf(entity);
        if (isLocked && drawn !== undefined) {
            padlocks.push(drawn);
        }
    }

    return {
        outlines,
        heavyOutline: isOne,
        bodyOutlines: bodyOutlinesOf(shown, source, outlines),
        rings,
        cameraFrames,
        padlocks,
        hiddenBox: undefined,
        sharedBox: isOne ? undefined : unionOf(shown, caches, false),
        count: undefined,
    };
}

// The visible shapes of the entity and everything inside it.
function collectShapes(entity: Entity, source: SelectionSource, into: Entity[]) {
    if (source.isHidden(entity)) return;
    if (entity.hasComponent(ShapeComponent)) {
        into.push(entity);
    }

    for (const child of entity.children) {
        collectShapes(child, source, into);
    }
}

// The body an entity's shapes collide with in play: the one it merges into, or its own. undefined for a
// surface with no body on it or above it.
function bodyOf(entity: Entity) {
    return mergesInto(entity) ?? (entity.hasComponent(BodyComponent) ? entity : undefined);
}

function collides(entity: Entity) {
    return entity.hasComponent(ShapeComponent) && entity.hasComponent(SurfaceComponent);
}

// Selecting anything with physics outlines its whole body: every colliding shape that merges into the same
// body, those already outlined left out.
function bodyOutlinesOf(shown: readonly Entity[], source: SelectionSource, outlined: readonly Entity[]) {
    const bodies = new Set<Entity>();

    for (const entity of shown) {
        const hasPhysics = entity.hasComponent(BodyComponent) || entity.hasComponent(SurfaceComponent);
        const body = hasPhysics ? bodyOf(entity) : undefined;
        if (body !== undefined) {
            bodies.add(body);
        }
    }

    const alreadyOutlined = new Set(outlined);
    const members: Entity[] = [];

    const visit = (entity: Entity, body: Entity) => {
        if (source.isHidden(entity)) return;

        const isMember = collides(entity) && bodyOf(entity) === body && !alreadyOutlined.has(entity);
        if (isMember) {
            members.push(entity);
            alreadyOutlined.add(entity);
        }

        for (const child of entity.children) {
            visit(child, body);
        }
    };

    for (const body of bodies) {
        visit(body, body);
    }

    return members;
}

// The drawn bounds of the entities together. An entity that draws nothing, such as a joint, counts as the
// point at its position when withPositions is set.
function unionOf(entities: readonly Entity[], caches: SelectionPlanCaches, withPositions: boolean) {
    let box: Bounds | undefined;

    for (const entity of entities) {
        const drawn =
            caches.bounds.subtreeBoundsOf(entity) ?? (withPositions ? pointBounds(entity, caches) : undefined);
        if (drawn === undefined) continue;

        box = box === undefined ? drawn : box.union(drawn);
    }

    return box;
}

function pointBounds(entity: Entity, caches: SelectionPlanCaches) {
    const matrix = caches.worldMatrices.matrixOf(entity);

    return new Bounds(matrix.tx, matrix.ty, matrix.tx, matrix.ty);
}

import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import type { AnyComponent } from '../../core/components/index.ts';
import { outlineStretchOf } from '../../core/derived/index.ts';
import type { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import type { Entity, Level, LevelUpdate } from '../../core/level/index.ts';
import type { Unsubscribe } from '../../core/events/index.ts';
import type { Bounds, Matrix2D } from '../../core/geometry/index.ts';
import { EntityDrawing } from './EntityDrawing.ts';
import type { EntityDrawingOptions } from './EntityDrawing.ts';
import { EntityNode } from './EntityNode.ts';

// The level's caches the display reads. DerivedCaches has them all.
export type LevelDisplayCaches = {
    readonly pieces: PiecesCache;
    // Must follow the same level. Culling reads it.
    readonly bounds: BoundsCache;
    // The one the BoundsCache reads. The joint icons and the physics view place themselves with it.
    readonly worldMatrices: WorldMatrixCache;
};

// During play, the entities whose level matrix comes from a body's pose instead of their TransformComponent:
// the bodies and the joints that follow them. PlayMirror is one, and says each time it places one.
export type PlayBodies = {
    // undefined for an entity whose matrix is its TransformComponent's.
    matrixOf(entity: Entity): Matrix2D | undefined;
    readonly placed: { subscribe(listener: (entity: Entity) => void): Unsubscribe };
};

export type LevelDisplayParts = {
    readonly level: Level;
    readonly caches: LevelDisplayCaches;
    // Given during play only.
    readonly playBodies?: PlayBodies;
    readonly options: EntityDrawingOptions;
    // Called after every change that shows on screen, so the view can draw once on the next frame.
    readonly onChange: () => void;
};

function changesDrawing(component: AnyComponent) {
    const schema = component.schema;

    return schema === ShapeComponent.schema || schema === PathComponent.schema || schema === StyleComponent.schema;
}

function changesMatrix(component: AnyComponent) {
    return component.schema === TransformComponent.schema;
}

function sameStretch(first: Matrix2D | undefined, second: Matrix2D | undefined) {
    if (first === undefined || second === undefined) return first === second;

    return first.a === second.a && first.b === second.b && first.c === second.c && first.d === second.d;
}

// One EntityNode per entity, nested like the entity tree. A move changes only a node's matrix; a shape,
// path or style change marks only that entity's drawing, rebuilt in prepare() just before a render.
export class LevelDisplay {
    private readonly parts: LevelDisplayParts;
    private readonly nodes = new Map<Entity, EntityNode>();
    private readonly staleDrawings = new Set<Entity>();
    // Placed by play since the last render, so their nodes' matrices are set from their poses then.
    private readonly placedSinceRender = new Set<Entity>();
    // Entities whose bounds may have changed since the last cull. While the visible area stays the same,
    // culling visits only these, their subtrees and their parents: a drag of 1,000 entities at 10,000
    // took 4 ms a frame walking them all.
    private readonly changedSinceCull = new Set<Entity>();
    private needsFullCull = true;
    private lastCullArea: Bounds | undefined;
    private readonly unsubscribe: Unsubscribe;
    private readonly stopFollowingBodies: Unsubscribe | undefined;
    private readonly worldNode: EntityNode;
    private drawingBuilds = 0;

    constructor(parts: LevelDisplayParts) {
        this.parts = parts;
        this.worldNode = this.buildSubtree(parts.level.world);
        this.unsubscribe = parts.level.signals.updated.subscribe((update) => this.handleUpdate(update));
        this.stopFollowingBodies = parts.playBodies?.placed.subscribe((entity) => this.bodyPlaced(entity));
    }

    // The World's node, which holds every other one.
    get root() {
        return this.worldNode.container;
    }

    get nodeCount() {
        return this.nodes.size;
    }

    // How many times an entity's drawing was built, for tests and the performance numbers.
    get drawingBuildCount() {
        return this.drawingBuilds;
    }

    nodeOf(entity: Entity) {
        return this.nodes.get(entity);
    }

    // Rebuilds the drawings marked since the last render, and places the nodes play moved.
    prepare() {
        this.placePlayedNodes();

        for (const entity of this.staleDrawings) {
            const node = this.nodes.get(entity);
            if (node === undefined) continue;

            EntityDrawing.draw(node.graphics, entity, this.parts.caches.pieces, this.parts.options);
            node.drawnOutlineStretch = outlineStretchOf(entity)?.stretch;
            this.drawingBuilds += 1;
        }

        this.staleDrawings.clear();
    }

    // Skips drawing what lies outside the visible area, a level rectangle. A subtree wholly outside it is
    // skipped as one, so its descendants are not even visited. Hidden subtrees are not visited either:
    // showing one again is a change, and every change renders, which culls again first.
    cull(visibleArea: Bounds) {
        const sameArea = this.lastCullArea !== undefined && this.lastCullArea.equals(visibleArea);
        const manyChanged = this.changedSinceCull.size * 2 > this.nodes.size;
        const cullAll = this.needsFullCull || !sameArea || manyChanged;

        if (cullAll) {
            const world = this.parts.level.world;
            this.cullSubtree(world, visibleArea);
        } else {
            for (const entity of this.changedSinceCull) {
                this.cullChanged(entity, visibleArea);
            }
        }

        this.lastCullArea = visibleArea;
        this.needsFullCull = false;
        this.changedSinceCull.clear();
    }

    dispose() {
        this.unsubscribe();
        this.stopFollowingBodies?.();
        this.placedSinceRender.clear();
        this.worldNode.destroy();
        this.nodes.clear();
        this.staleDrawings.clear();
        this.changedSinceCull.clear();
    }

    private bodyPlaced(entity: Entity) {
        this.placedSinceRender.add(entity);
        this.changedSinceCull.add(entity);
        this.parts.onChange();
    }

    // Each placed entity's node, and every one inside it that play places too, as a body inside a body
    // that didn't move: its node's matrix is from its parent's space, and the parent moved.
    private placePlayedNodes() {
        const playBodies = this.parts.playBodies;
        if (playBodies === undefined) return;

        for (const placed of this.placedSinceRender) {
            const waiting = [placed];
            for (let entity = waiting.pop(); entity !== undefined; entity = waiting.pop()) {
                waiting.push(...entity.children);
                this.placeFromPlay(entity, playBodies);
            }
        }
        this.placedSinceRender.clear();
    }

    private placeFromPlay(entity: Entity, playBodies: PlayBodies) {
        const node = this.nodes.get(entity);
        if (node === undefined) return;
        if (playBodies.matrixOf(entity) === undefined) return;

        const worldMatrices = this.parts.caches.worldMatrices;
        const levelMatrix = worldMatrices.matrixOf(entity);
        const parent = entity.parent;
        if (parent === undefined) {
            node.applyMatrix(levelMatrix);
            return;
        }

        // A parent scaled to nothing can't be undone; the editor refuses a scale of 0, so it never is.
        const fromLevelToParent = worldMatrices.matrixOf(parent).invert();
        if (fromLevelToParent === undefined) return;

        node.applyMatrix(fromLevelToParent.multiply(levelMatrix));
    }

    private buildSubtree(entity: Entity) {
        const isWorld = entity === this.parts.level.world;
        const node = new EntityNode(entity, isWorld);
        this.nodes.set(entity, node);
        this.staleDrawings.add(entity);

        // Bottom row first, so the top row ends up last and is drawn in front.
        const bottomRowFirst = [...entity.children].reverse();
        for (const child of bottomRowFirst) {
            const childNode = this.buildSubtree(child);
            node.appendChild(childNode);
        }

        return node;
    }

    private cullSubtree(entity: Entity, visibleArea: Bounds) {
        const node = this.requireNode(entity);
        if (entity.isHidden) return;

        const bounds = this.parts.caches.bounds;
        const subtreeBounds = bounds.subtreeBoundsOf(entity);
        const subtreeOnScreen = subtreeBounds !== undefined && subtreeBounds.overlaps(visibleArea);
        node.container.renderable = subtreeOnScreen;
        if (!subtreeOnScreen) return;

        const ownBounds = bounds.ownBoundsOf(entity);
        const ownOnScreen = ownBounds !== undefined && ownBounds.overlaps(visibleArea);
        node.graphics.renderable = ownOnScreen;

        for (const child of entity.children) {
            this.cullSubtree(child, visibleArea);
        }
    }

    // Culls one changed entity's subtree. Its parents' subtree bounds changed with it, so each is culled on
    // the way down; one that comes back on screen is culled whole, since its subtree was skipped while off it.
    private cullChanged(entity: Entity, visibleArea: Bounds) {
        if (!this.nodes.has(entity)) return;

        const parentsFromWorld: Entity[] = [];
        for (let parent = entity.parent; parent !== undefined; parent = parent.parent) {
            parentsFromWorld.unshift(parent);
        }

        const bounds = this.parts.caches.bounds;
        for (const parent of parentsFromWorld) {
            if (parent.isHidden) return;

            const container = this.requireNode(parent).container;
            const subtreeBounds = bounds.subtreeBoundsOf(parent);
            const subtreeOnScreen = subtreeBounds !== undefined && subtreeBounds.overlaps(visibleArea);
            const comesBackOnScreen = subtreeOnScreen && !container.renderable;
            if (comesBackOnScreen) {
                this.cullSubtree(parent, visibleArea);
                return;
            }

            container.renderable = subtreeOnScreen;
            if (!subtreeOnScreen) return;
        }

        this.cullSubtree(entity, visibleArea);
    }

    private handleUpdate(update: LevelUpdate) {
        this.noteCullingChange(update);

        switch (update.kind) {
            case 'entityAdded':
                this.addNode(update.entity);
                break;
            case 'entityRemoved':
                this.removeNode(update.entity);
                break;
            case 'entityMoved':
                this.placeNode(update.entity);
                break;
            case 'componentAdded':
            case 'componentRemoved':
            case 'valueChanged':
                this.handleComponentChange(update.entity, update.component);
                break;
            case 'switchChanged':
                if (update.switchName !== 'hidden') return;

                this.requireNode(update.entity).applyHidden();
                break;
            case 'levelRenamed':
                return;
        }

        this.parts.onChange();
    }

    // A component's change can change the entity's bounds; a change to the tree or a hidden switch can
    // change what is visited at all.
    private noteCullingChange(update: LevelUpdate) {
        switch (update.kind) {
            case 'componentAdded':
            case 'componentRemoved':
            case 'valueChanged':
                this.changedSinceCull.add(update.entity);
                return;
            case 'switchChanged':
                if (update.switchName === 'hidden') {
                    this.needsFullCull = true;
                }
                return;
            case 'levelRenamed':
                return;
            default:
                this.needsFullCull = true;
        }
    }

    private addNode(entity: Entity) {
        const node = this.buildSubtree(entity);
        this.placeNode(entity, node);
    }

    private placeNode(entity: Entity, node = this.requireNode(entity)) {
        const parent = entity.parent;
        if (parent === undefined) return;

        this.requireNode(parent).placeChild(node);
    }

    // Children are removed before their parent, so the node holds no other entity's node by now.
    private removeNode(entity: Entity) {
        const node = this.nodes.get(entity);
        if (node === undefined) return;

        node.destroy();
        this.nodes.delete(entity);
        this.staleDrawings.delete(entity);
        // Play can place a body and remove it before the next render, as when it falls past the level bounds.
        this.placedSinceRender.delete(entity);
    }

    private handleComponentChange(entity: Entity, component: AnyComponent) {
        if (changesMatrix(component)) {
            const node = this.requireNode(entity);
            node.applyTransform();
            this.noteOutlineStretch(entity, node);
        }

        if (changesDrawing(component)) {
            this.staleDrawings.add(entity);
        }
    }

    // With Scale outline off, the drawing holds the entity's own scale and skew, so a change to them rebuilds
    // it. A move or a turn doesn't, so dragging many entities still only changes their matrices.
    private noteOutlineStretch(entity: Entity, node: EntityNode) {
        const stretch = outlineStretchOf(entity)?.stretch;
        if (sameStretch(stretch, node.drawnOutlineStretch)) return;

        this.staleDrawings.add(entity);
    }

    private requireNode(entity: Entity) {
        const node = this.nodes.get(entity);
        if (node === undefined) {
            throw new Error(`Entity ${entity.id} has no node.`);
        }

        return node;
    }
}

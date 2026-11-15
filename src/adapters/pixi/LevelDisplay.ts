import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import type { AnyComponent } from '../../core/components/index.ts';
import type { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import type { Entity, Level, LevelUpdate } from '../../core/entities/index.ts';
import type { Unsubscribe } from '../../core/events/index.ts';
import type { Bounds } from '../../core/geometry/index.ts';
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

export type LevelDisplayParts = {
    readonly level: Level;
    readonly caches: LevelDisplayCaches;
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

// One EntityNode per entity, nested like the entity tree. A move changes only a node's matrix; a shape,
// path or style change marks only that entity's drawing, rebuilt in prepare() just before a render.
export class LevelDisplay {
    private readonly parts: LevelDisplayParts;
    private readonly nodes = new Map<Entity, EntityNode>();
    private readonly staleDrawings = new Set<Entity>();
    private readonly unsubscribe: Unsubscribe;
    private readonly worldNode: EntityNode;
    private drawingBuilds = 0;

    constructor(parts: LevelDisplayParts) {
        this.parts = parts;
        this.worldNode = this.buildSubtree(parts.level.world);
        this.unsubscribe = parts.level.signals.updated.subscribe((update) => this.handleUpdate(update));
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

    // Rebuilds the drawings marked since the last render.
    prepare() {
        for (const entity of this.staleDrawings) {
            const node = this.nodes.get(entity);
            if (node === undefined) continue;

            EntityDrawing.draw(node.graphics, entity, this.parts.caches.pieces, this.parts.options);
            this.drawingBuilds += 1;
        }

        this.staleDrawings.clear();
    }

    // Skips drawing what lies outside the visible area, a level rectangle. A subtree wholly outside it is
    // skipped as one, so its descendants are not even visited. Hidden subtrees are not visited either:
    // showing one again is a change, and every change renders, which culls again first.
    cull(visibleArea: Bounds) {
        const world = this.parts.level.world;
        this.cullSubtree(world, visibleArea);
    }

    dispose() {
        this.unsubscribe();
        this.worldNode.destroy();
        this.nodes.clear();
        this.staleDrawings.clear();
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

    private handleUpdate(update: LevelUpdate) {
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
    }

    private handleComponentChange(entity: Entity, component: AnyComponent) {
        if (changesMatrix(component)) {
            this.requireNode(entity).applyTransform();
        }

        if (changesDrawing(component)) {
            this.staleDrawings.add(entity);
        }
    }

    private requireNode(entity: Entity) {
        const node = this.nodes.get(entity);
        if (node === undefined) {
            throw new Error(`Entity ${entity.id} has no node.`);
        }

        return node;
    }
}

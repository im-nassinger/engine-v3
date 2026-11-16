import { Container, Graphics, Matrix } from 'pixi.js';
import { TransformComponent } from '../../core/components/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { Matrix2D } from '../../core/geometry/index.ts';
import { ChunkedChildren } from './ChunkedChildren.ts';

// One entity on screen: a Container that carries its matrix from its parent and its own hidden switch,
// holding its children's nodes and one Graphics for what it draws. PixiJS multiplies the matrices and
// hides children with their parent, which is what WorldMatrixCache and HiddenCache say.
export class EntityNode {
    readonly entity: Entity;
    readonly container = new Container();
    readonly graphics = new Graphics();
    // Holds the children's nodes, the top row last so it is drawn in front.
    readonly childrenLayer: Container;
    // Only the World's children are split into render chunks: they hold the whole level.
    private readonly chunkedChildren: ChunkedChildren | undefined;

    // The draw order is the panel order backwards: an entity is drawn in front of its children. The
    // World is the exception, drawn first, because its fill is the background.
    constructor(entity: Entity, isWorld: boolean) {
        this.entity = entity;

        if (isWorld) {
            this.chunkedChildren = new ChunkedChildren();
            this.childrenLayer = this.chunkedChildren.container;
        } else {
            this.childrenLayer = new Container();
        }

        if (isWorld) {
            this.container.addChild(this.graphics, this.childrenLayer);
        } else {
            this.container.addChild(this.childrenLayer, this.graphics);
        }

        this.applyTransform();
        this.applyHidden();
    }

    get childNodeCount() {
        if (this.chunkedChildren !== undefined) return this.chunkedChildren.count;

        return this.childrenLayer.children.length;
    }

    // The children's containers in draw order, the first drawn first.
    get drawnChildren(): readonly Container[] {
        if (this.chunkedChildren !== undefined) return this.chunkedChildren.children;

        return this.childrenLayer.children;
    }

    applyTransform() {
        const transform = this.entity.getComponent(TransformComponent);
        let matrix = Matrix2D.identity();

        if (transform !== undefined) {
            const values = {
                position: transform.get('position'),
                rotation: transform.get('rotation'),
                scale: transform.get('scale'),
                skew: transform.get('skew'),
            };
            matrix = Matrix2D.fromTransform(values);
        }

        const pixiMatrix = new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        this.container.setFromMatrix(pixiMatrix);
    }

    applyHidden() {
        this.container.visible = !this.entity.isHidden;
    }

    // Adds a child's node in front of the ones already there, for building a subtree bottom row first.
    appendChild(child: EntityNode) {
        if (this.chunkedChildren !== undefined) {
            this.chunkedChildren.append(child.container);
            return;
        }

        this.childrenLayer.addChild(child.container);
    }

    // Puts a child's node where the entity tree has it. Call after the tree has the child in place.
    placeChild(child: EntityNode) {
        const panelIndex = this.entity.children.indexOf(child.entity);
        if (panelIndex === -1) {
            throw new Error(`Entity ${child.entity.id} is not a child of entity ${this.entity.id}.`);
        }

        child.container.removeFromParent();

        const siblingCount = this.childNodeCount;
        const drawIndex = siblingCount - panelIndex;
        if (this.chunkedChildren !== undefined) {
            this.chunkedChildren.insertAt(drawIndex, child.container);
            return;
        }

        this.childrenLayer.addChildAt(child.container, drawIndex);
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}

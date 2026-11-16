import { Graphics } from 'pixi.js';
import type { FillStyle, StrokeStyle } from 'pixi.js';
import { PhysicsWorldComponent, ShapeComponent, SurfaceComponent } from '../../../core/components/index.ts';
import { levelBoundsOf } from '../../../core/derived/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { LineChains, ShapePieces } from '../../../core/geometry/index.ts';
import type { CollisionPiece, Matrix2D, Point, ShapeGeometry } from '../../../core/geometry/index.ts';
import type { OverlayCaches, OverlayScene } from './OverlayScene.ts';
import { screenRectangleOf } from './screenPixels.ts';

const PIECE_COLOUR = 0xff8a3d;
const PIECE_FILL: FillStyle = { color: PIECE_COLOUR, alpha: 0.15 };
const PIECE_EDGE: StrokeStyle = { color: PIECE_COLOUR, width: 1.5, join: 'round', cap: 'round' };
function piecesFor(entity: Entity, geometry: ShapeGeometry, matrix: Matrix2D, caches: OverlayCaches) {
    const result = caches.pieces.piecesOf(entity);
    const pieces = result?.pieces ?? [];
    const hasCircle = pieces.some((piece) => piece.kind === 'circle');
    // The play copy hands Box2D a circle only when the entity's level matrix scales evenly, mirrors included.
    if (!hasCircle || matrix.scalesEvenly()) return pieces;

    return ShapePieces.buildAsPolygons(geometry).pieces;
}

function collides(entity: Entity) {
    return entity.hasComponent(ShapeComponent) && entity.hasComponent(SurfaceComponent);
}

// Draws every collision piece over the level, in orange, whatever the eye or the opacity says: the same
// pieces the game gives the physics engine, at each entity's level matrix. A line draws its chains, and
// the World's rectangle its edges when Walls is on. Hidden by its View menu switch.
export class PhysicsViewOverlay {
    readonly graphics = new Graphics();
    private drawnPieces = 0;

    // How many pieces, chains and walls were drawn last, for tests.
    get drawnPieceCount() {
        return this.drawnPieces;
    }

    update(scene: OverlayScene) {
        this.graphics.clear();
        this.drawnPieces = 0;

        const level = scene.level;
        const caches = scene.caches;
        const isOn = scene.settings.isOn('physicsView');
        this.graphics.visible = isOn;
        if (!isOn || level === undefined || caches === undefined) return;

        const visible = scene.view.visibleBounds();
        const viewMatrix = scene.view.matrix();

        for (const entity of level.entitiesInDrawOrder()) {
            if (!collides(entity)) continue;

            const ownBounds = caches.bounds.ownBoundsOf(entity);
            if (ownBounds === undefined || !ownBounds.overlaps(visible)) continue;

            const levelMatrix = caches.worldMatrices.matrixOf(entity);
            this.drawShape(entity, levelMatrix, viewMatrix, caches);
        }

        this.drawWalls(scene);
    }

    destroy() {
        this.graphics.destroy();
    }

    private drawShape(entity: Entity, levelMatrix: Matrix2D, viewMatrix: Matrix2D, caches: OverlayCaches) {
        const geometry = entity.requireComponent(ShapeComponent).get('geometry');
        const toScreen = viewMatrix.multiply(levelMatrix);

        if (geometry.kind === 'line') {
            for (const chain of LineChains.build(geometry.points)) {
                this.drawChain(chain, toScreen);
            }
            return;
        }

        for (const piece of piecesFor(entity, geometry, levelMatrix, caches)) {
            this.drawPiece(piece, toScreen);
        }
    }

    private drawPiece(piece: CollisionPiece, toScreen: Matrix2D) {
        if (piece.kind === 'circle') {
            const centre = toScreen.apply({ x: 0, y: 0 });
            const radius = piece.radius * toScreen.largestStretch();
            this.graphics.circle(centre.x, centre.y, radius).fill(PIECE_FILL).stroke(PIECE_EDGE);
        } else {
            const flat = piece.points.flatMap((point) => {
                const onScreen = toScreen.apply(point);
                return [onScreen.x, onScreen.y];
            });
            this.graphics.poly(flat, true).fill(PIECE_FILL).stroke(PIECE_EDGE);
        }

        this.drawnPieces += 1;
    }

    private drawChain(chain: readonly Point[], toScreen: Matrix2D) {
        const [first, ...rest] = chain.map((point) => toScreen.apply(point));
        if (first === undefined) return;

        this.graphics.moveTo(first.x, first.y);
        for (const point of rest) {
            this.graphics.lineTo(point.x, point.y);
        }
        this.graphics.stroke(PIECE_EDGE);
        this.drawnPieces += 1;
    }

    private drawWalls(scene: OverlayScene) {
        const level = scene.level;
        const physicsWorld = level?.world.getComponent(PhysicsWorldComponent);
        if (level === undefined || physicsWorld?.get('walls') !== true) return;

        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) return;

        const onScreen = screenRectangleOf(levelBounds, scene.view);
        this.graphics.rect(onScreen.left, onScreen.top, onScreen.width, onScreen.height).stroke(PIECE_EDGE);
        this.drawnPieces += 1;
    }
}

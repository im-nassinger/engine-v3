import {
    CameraComponent,
    JointComponent,
    PathComponent,
    ShapeComponent,
    StyleComponent,
} from '../../components/index.ts';
import type { Entity } from '../../entities/index.ts';
import type { Matrix2D, PathGeometry, Point, ShapeGeometry } from '../../geometry/index.ts';
import { Bounds } from '../../geometry/index.ts';

// Not Math.hypot, which IEEE 754 doesn't define exactly, so it may differ between browsers.
function lengthOf(x: number, y: number) {
    return Math.sqrt(x * x + y * y);
}

// The level bounds of an ellipse centred on the origin, exactly: across x it reaches
// sqrt((a * halfWidth)^2 + (c * halfHeight)^2) from its centre, and the same for y with b and d.
function ellipseBounds(width: number, height: number, matrix: Matrix2D) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const reachX = lengthOf(matrix.a * halfWidth, matrix.c * halfHeight);
    const reachY = lengthOf(matrix.b * halfWidth, matrix.d * halfHeight);

    return new Bounds(matrix.tx - reachX, matrix.ty - reachY, matrix.tx + reachX, matrix.ty + reachY);
}

function centredRectangleCorners(width: number, height: number): Point[] {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    return [
        { x: -halfWidth, y: -halfHeight },
        { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight },
        { x: -halfWidth, y: halfHeight },
    ];
}

function boundsOfMovedPoints(points: readonly Point[], matrix: Matrix2D) {
    const movedPoints = points.map((point) => matrix.apply(point));

    return Bounds.around(movedPoints);
}

function shapeBounds(geometry: ShapeGeometry, matrix: Matrix2D) {
    switch (geometry.kind) {
        case 'rectangle': {
            const corners = centredRectangleCorners(geometry.width, geometry.height);
            return boundsOfMovedPoints(corners, matrix);
        }
        case 'ellipse':
            return ellipseBounds(geometry.width, geometry.height, matrix);
        case 'polygon':
        case 'line':
            return boundsOfMovedPoints(geometry.points, matrix);
    }
}

// A curve stays inside its points and their handles, so those bound it, a little loosely where it bends.
function pathBounds(path: PathGeometry, matrix: Matrix2D) {
    const points: Point[] = [];

    for (const pathPoint of path.points) {
        points.push({ x: pathPoint.x, y: pathPoint.y });

        if (pathPoint.handleIn !== null) {
            points.push({ x: pathPoint.x + pathPoint.handleIn.x, y: pathPoint.y + pathPoint.handleIn.y });
        }
        if (pathPoint.handleOut !== null) {
            points.push({ x: pathPoint.x + pathPoint.handleOut.x, y: pathPoint.y + pathPoint.handleOut.y });
        }
    }

    return boundsOfMovedPoints(points, matrix);
}

// The frame of what players see, centred on the camera's position.
function cameraBounds(camera: CameraComponent, matrix: Matrix2D) {
    const corners = centredRectangleCorners(camera.get('width'), camera.get('height'));

    return boundsOfMovedPoints(corners, matrix);
}

// The outline is drawn in the entity's own space, so the matrix stretches it like the shape, at most by its
// largest stretch. With round joins it stays within half its width of the edge.
function withOutline(edgeBounds: Bounds, entity: Entity, matrix: Matrix2D) {
    const style = entity.getComponent(StyleComponent);
    if (style === undefined) return edgeBounds;

    const halfOutline = style.get('outlineWidth') / 2;
    const margin = halfOutline * matrix.largestStretch();

    return edgeBounds.expandedBy(margin);
}

// What an entity draws, in level positions: a path, else a shape, else a camera's frame, the order in
// which an entity picks the one thing it draws. undefined when it draws nothing, like a group.
// A joint also covers the point at its position, where its icon sits; the icon's size on screen is added
// by whoever knows the zoom.
export class OwnBounds {
    static of(entity: Entity, matrix: Matrix2D) {
        const drawnBounds = OwnBounds.drawnBoundsOf(entity, matrix);
        if (!entity.hasComponent(JointComponent)) return drawnBounds;

        const position = new Bounds(matrix.tx, matrix.ty, matrix.tx, matrix.ty);
        if (drawnBounds === undefined) return position;

        return drawnBounds.union(position);
    }

    private static drawnBoundsOf(entity: Entity, matrix: Matrix2D) {
        const edgeBounds = OwnBounds.edgeBoundsOf(entity, matrix);
        if (edgeBounds === undefined) return undefined;

        const drawsAnOutline = entity.hasComponent(PathComponent) || entity.hasComponent(ShapeComponent);
        if (!drawsAnOutline) return edgeBounds;

        return withOutline(edgeBounds, entity, matrix);
    }

    private static edgeBoundsOf(entity: Entity, matrix: Matrix2D) {
        const path = entity.getComponent(PathComponent);
        if (path !== undefined) {
            const pathGeometry = path.get('path');
            return pathBounds(pathGeometry, matrix);
        }

        const shape = entity.getComponent(ShapeComponent);
        if (shape !== undefined) {
            const geometry = shape.get('geometry');
            return shapeBounds(geometry, matrix);
        }

        const camera = entity.getComponent(CameraComponent);
        if (camera !== undefined) return cameraBounds(camera, matrix);

        return undefined;
    }
}

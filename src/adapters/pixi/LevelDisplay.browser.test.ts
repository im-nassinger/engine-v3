import { autoDetectRenderer, Rectangle } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import { afterEach, describe, expect, test } from 'vitest';
import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { Level } from '../../core/level/index.ts';
import { Bounds, Matrix2D } from '../../core/geometry/index.ts';
import type { ShapeGeometry } from '../../core/geometry/index.ts';
import { LevelDisplay } from './LevelDisplay.ts';
import type { PlayBodies } from './LevelDisplay.ts';
import { Signal } from '../../core/events/index.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function makeDisplay(level: Level, showUnstyled = true) {
    const pieces = new PiecesCache(level);
    const worldMatrices = new WorldMatrixCache(level);
    const bounds = new BoundsCache(level, worldMatrices);
    let changeCount = 0;
    const display = new LevelDisplay({
        level,
        caches: { pieces, bounds, worldMatrices },
        options: { showUnstyled },
        onChange: () => {
            changeCount += 1;
        },
    });
    cleanups.push(() => {
        display.dispose();
        bounds.dispose();
        worldMatrices.dispose();
        pieces.dispose();
    });

    return { display, changes: () => changeCount };
}

function addShape(level: Level, parent: Entity, geometry: ShapeGeometry, index = 0) {
    const entity = level.createEntity(parent, index);
    entity.addComponent(new TransformComponent());
    entity.addComponent(new ShapeComponent({ geometry }));
    entity.addComponent(new StyleComponent());

    return entity;
}

function addGroup(level: Level, parent: Entity, index = 0) {
    const group = level.createEntity(parent, index);
    group.addComponent(new TransformComponent());

    return group;
}

// Every entity's node sits in its parent's node, the top row last so it is drawn in front.
function expectNodesLikeTree(display: LevelDisplay, level: Level) {
    expect(display.nodeCount).toBe(level.entityCount);

    for (const entity of level.entitiesInPanelOrder()) {
        const node = display.nodeOf(entity);
        if (node === undefined) throw new Error(`Entity ${entity.id} has no node.`);

        const drawnChildren = node.drawnChildren.map((container) => {
            const childNode = [...entity.children].find((child) => display.nodeOf(child)?.container === container);
            return childNode;
        });
        const panelOrderBackwards = [...entity.children].reverse();

        expect(drawnChildren).toEqual(panelOrderBackwards);
    }
}

const SQUARE: ShapeGeometry = { kind: 'rectangle', width: 100, height: 100 };

describe('LevelDisplay', () => {
    test('builds one node per entity, nested like the tree, the top row drawn in front', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world, 1);
        addShape(level, group, SQUARE, 0);
        addShape(level, group, SQUARE, 1);
        addShape(level, level.world, SQUARE, 0);

        const { display } = makeDisplay(level);

        expectNodesLikeTree(display, level);
    });

    test('the World draws behind its children and every other entity in front of its own', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world, 1);
        addShape(level, group, SQUARE);
        const { display } = makeDisplay(level);

        const worldNode = display.nodeOf(level.world);
        const groupNode = display.nodeOf(group);

        expect(worldNode?.container.children).toEqual([worldNode?.graphics, worldNode?.childrenLayer]);
        expect(groupNode?.container.children).toEqual([groupNode?.childrenLayer, groupNode?.graphics]);
    });

    test('adding, removing and moving entities between parents keeps the nodes like the tree', () => {
        const level = Level.createNew();
        const firstGroup = addGroup(level, level.world, 1);
        const secondGroup = addGroup(level, level.world, 2);
        const { display } = makeDisplay(level);

        const square = addShape(level, firstGroup, SQUARE);
        addShape(level, firstGroup, SQUARE, 1);
        expectNodesLikeTree(display, level);

        level.moveEntity(square, secondGroup, 0);
        expectNodesLikeTree(display, level);

        level.moveEntity(secondGroup, level.world, 0);
        expectNodesLikeTree(display, level);

        level.removeEntity(firstGroup);
        expectNodesLikeTree(display, level);
        expect(display.nodeOf(firstGroup)).toBeUndefined();
    });

    test('a body play places and then removes before the next render is not placed', () => {
        const level = Level.createNew();
        const ball = addShape(level, level.world, SQUARE);
        const placed = new Signal<Entity>();
        const playBodies: PlayBodies = { matrixOf: () => Matrix2D.identity(), placed };
        const worldMatrices = new WorldMatrixCache(level);
        const display = new LevelDisplay({
            level,
            caches: { pieces: new PiecesCache(level), bounds: new BoundsCache(level, worldMatrices), worldMatrices },
            playBodies,
            options: { showUnstyled: true },
            onChange: () => undefined,
        });
        cleanups.push(() => display.dispose());

        placed.emit(ball);
        level.removeEntity(ball);

        expect(() => display.prepare()).not.toThrow();
    });

    test('a World with hundreds of children keeps them like the tree across its render chunks', () => {
        const level = Level.createNew();
        const squares: Entity[] = [];
        for (let index = 0; index < 300; index += 1) {
            squares.push(addShape(level, level.world, SQUARE, index));
        }
        const group = addGroup(level, level.world, 150);
        const { display } = makeDisplay(level);
        expectNodesLikeTree(display, level);

        const [first, second, third] = squares;
        if (first === undefined || second === undefined || third === undefined) throw new Error('No squares.');
        level.moveEntity(first, level.world, 299);
        level.moveEntity(second, group, 0);
        level.removeEntity(third);
        addShape(level, level.world, SQUARE, 200);
        expectNodesLikeTree(display, level);
    });

    test('a style change rebuilds only that entity drawing', () => {
        const level = Level.createNew();
        const changed = addShape(level, level.world, SQUARE);
        addShape(level, level.world, SQUARE);
        const { display, changes } = makeDisplay(level);
        display.prepare();
        const buildsBefore = display.drawingBuildCount;

        changed.requireComponent(StyleComponent).set('outlineWidth', 10);
        display.prepare();

        expect(display.drawingBuildCount).toBe(buildsBefore + 1);
        expect(changes()).toBe(1);
    });

    test('a move changes only the matrix', () => {
        const level = Level.createNew();
        const square = addShape(level, level.world, SQUARE);
        const { display } = makeDisplay(level);
        display.prepare();
        const buildsBefore = display.drawingBuildCount;

        square.requireComponent(TransformComponent).set('position', { x: 30, y: -20 });
        display.prepare();

        const container = display.nodeOf(square)?.container;
        expect(display.drawingBuildCount).toBe(buildsBefore);
        expect(container?.position.x).toBeCloseTo(30);
        expect(container?.position.y).toBeCloseTo(-20);
    });

    test('a child follows its parent through the nested matrices', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world, 1);
        const square = addShape(level, group, SQUARE);
        square.requireComponent(TransformComponent).set('position', { x: 10, y: 0 });
        group.requireComponent(TransformComponent).set('position', { x: 100, y: 50 });
        group.requireComponent(TransformComponent).set('scale', { x: 2, y: 2 });
        const { display } = makeDisplay(level);

        const container = display.nodeOf(square)?.container;
        const levelPoint = container?.toGlobal({ x: 0, y: 0 });

        expect(levelPoint?.x).toBeCloseTo(120);
        expect(levelPoint?.y).toBeCloseTo(50);
    });

    test('a shape draws its fill with its outline around it, half the outline width outside', () => {
        const level = Level.createNew();
        const square = addShape(level, level.world, { kind: 'rectangle', width: 100, height: 60 });
        square.requireComponent(StyleComponent).set('outlineWidth', 4);
        const { display } = makeDisplay(level);
        display.prepare();

        const bounds = display.nodeOf(square)?.graphics.getLocalBounds();

        expect(bounds?.minX).toBeCloseTo(-52);
        expect(bounds?.maxX).toBeCloseTo(52);
        expect(bounds?.minY).toBeCloseTo(-32);
        expect(bounds?.maxY).toBeCloseTo(32);
    });

    // In the group's space, the one just outside the shape: Scale outline measures the outline there.
    function drawnBoundsInGroup(scaleOutline: boolean, geometry: ShapeGeometry) {
        const level = Level.createNew();
        const group = addGroup(level, level.world);
        const shape = addShape(level, group, geometry);
        const style = shape.requireComponent(StyleComponent);
        style.set('outlineWidth', 4);
        style.set('scaleOutline', scaleOutline);
        shape.requireComponent(TransformComponent).set('scale', { x: 3, y: 1 });
        const { display } = makeDisplay(level);
        display.prepare();

        const groupContainer = display.nodeOf(group)?.container;
        const bounds = () => groupContainer?.getLocalBounds();

        return { display, shape, bounds };
    }

    test('a rectangle scaled 3 by 1 keeps its outline 4 px wide with Scale outline off', () => {
        const { bounds } = drawnBoundsInGroup(false, { kind: 'rectangle', width: 40, height: 20 });

        expect(bounds()?.minX).toBeCloseTo(-62);
        expect(bounds()?.maxX).toBeCloseTo(62);
        expect(bounds()?.minY).toBeCloseTo(-12);
        expect(bounds()?.maxY).toBeCloseTo(12);
    });

    test('a rectangle scaled 3 by 1 stretches its outline to 12 px across with Scale outline on', () => {
        const { bounds } = drawnBoundsInGroup(true, { kind: 'rectangle', width: 40, height: 20 });

        expect(bounds()?.minX).toBeCloseTo(-66);
        expect(bounds()?.maxX).toBeCloseTo(66);
        expect(bounds()?.minY).toBeCloseTo(-12);
        expect(bounds()?.maxY).toBeCloseTo(12);
    });

    test('a circle stretched into an ellipse keeps its outline width with Scale outline off', () => {
        const { bounds } = drawnBoundsInGroup(false, { kind: 'circle', radius: 10 });

        expect(bounds()?.minX).toBeCloseTo(-32, 1);
        expect(bounds()?.maxX).toBeCloseTo(32, 1);
        expect(bounds()?.minY).toBeCloseTo(-12, 1);
        expect(bounds()?.maxY).toBeCloseTo(12, 1);
    });

    test('with Scale outline off, a change of scale rebuilds the drawing, and a move does not', () => {
        const { display, shape, bounds } = drawnBoundsInGroup(false, { kind: 'rectangle', width: 40, height: 20 });
        const transform = shape.requireComponent(TransformComponent);
        const buildsBefore = display.drawingBuildCount;

        transform.set('position', { x: 5, y: 0 });
        display.prepare();
        const buildsAfterMove = display.drawingBuildCount;

        transform.set('scale', { x: 1, y: 1 });
        display.prepare();

        expect(buildsAfterMove).toBe(buildsBefore);
        expect(display.drawingBuildCount).toBe(buildsBefore + 1);
        expect(bounds()?.minX).toBeCloseTo(-17);
        expect(bounds()?.maxX).toBeCloseTo(27);
    });

    test('opacity is the drawing alpha, and hiding an entity hides its node', () => {
        const level = Level.createNew();
        const square = addShape(level, level.world, SQUARE);
        square.requireComponent(StyleComponent).set('opacity', 0.25);
        const { display } = makeDisplay(level);
        display.prepare();

        square.setHidden(true);

        const node = display.nodeOf(square);
        expect(node?.graphics.alpha).toBe(0.25);
        expect(node?.container.visible).toBe(false);
    });

    test('a path with no StyleComponent draws a thin line in the editor and nothing in play', () => {
        const drawUnstyledPath = (showUnstyled: boolean) => {
            const level = Level.createNew();
            const path = level.createEntity(level.world, 0);
            path.addComponent(new TransformComponent());
            path.addComponent(
                new PathComponent({
                    path: {
                        closed: false,
                        points: [
                            { x: 0, y: 0, corner: 'sharp', handleIn: null, handleOut: null },
                            { x: 100, y: 0, corner: 'sharp', handleIn: null, handleOut: null },
                        ],
                    },
                }),
            );
            const { display } = makeDisplay(level, showUnstyled);
            display.prepare();

            return display.nodeOf(path)?.graphics.getLocalBounds();
        };

        expect(drawUnstyledPath(true)?.width).toBeGreaterThan(99);
        expect(drawUnstyledPath(false)?.width).toBe(0);
    });

    test('a shape with no StyleComponent draws nothing in the level: UnstyledShapeOverlay shows it', () => {
        const level = Level.createNew();
        const shape = addShape(level, level.world, SQUARE);
        shape.removeComponent(StyleComponent);
        const { display } = makeDisplay(level, true);
        display.prepare();

        expect(display.nodeOf(shape)?.graphics.getLocalBounds().width).toBe(0);
    });

    test('a line, a self-crossing polygon, a circle and a path all draw', () => {
        const level = Level.createNew();
        const line = addShape(level, level.world, {
            kind: 'line',
            points: [
                { x: 0, y: 0 },
                { x: 50, y: 10 },
            ],
        });
        const figureOfEight = addShape(level, level.world, {
            kind: 'polygon',
            points: [
                { x: 0, y: 0 },
                { x: 100, y: 100 },
                { x: 100, y: 0 },
                { x: 0, y: 100 },
            ],
        });
        const circle = addShape(level, level.world, { kind: 'circle', radius: 40 });
        const path = level.createEntity(level.world, 0);
        path.addComponent(new TransformComponent());
        path.addComponent(
            new PathComponent({
                path: {
                    closed: false,
                    points: [
                        { x: 0, y: 0, handleIn: null, handleOut: { x: 20, y: 0 }, corner: 'smooth' },
                        { x: 60, y: 30, handleIn: { x: -20, y: 0 }, handleOut: null, corner: 'smooth' },
                    ],
                },
            }),
        );
        path.addComponent(new StyleComponent());
        const { display } = makeDisplay(level);
        display.prepare();

        for (const entity of [line, figureOfEight, circle, path]) {
            const bounds = display.nodeOf(entity)?.graphics.getLocalBounds();
            expect(bounds?.width).toBeGreaterThan(40);
        }
    });

    test('dispose stops following the level', () => {
        const level = Level.createNew();
        const { display, changes } = makeDisplay(level);

        display.dispose();
        addShape(level, level.world, SQUARE);

        expect(changes()).toBe(0);
    });
});

describe('LevelDisplay culling', () => {
    // The default World's rectangle is centred on the origin and much larger than this area.
    const VISIBLE_AREA = new Bounds(-100, -100, 100, 100);

    function nodeOf(display: LevelDisplay, entity: Entity) {
        const node = display.nodeOf(entity);
        if (node === undefined) throw new Error(`Entity ${entity.id} has no node.`);

        return node;
    }

    test('an entity off screen is not drawn, one on screen or touching its edge is', () => {
        const level = Level.createNew();
        const onScreen = addShape(level, level.world, SQUARE);
        const offScreen = addShape(level, level.world, SQUARE);
        const touching = addShape(level, level.world, SQUARE);
        offScreen.requireComponent(TransformComponent).set('position', { x: 500, y: 0 });
        touching.requireComponent(StyleComponent).set('outlineWidth', 0);
        touching.requireComponent(TransformComponent).set('position', { x: 0, y: 150 });
        const { display } = makeDisplay(level);

        display.cull(VISIBLE_AREA);

        expect(nodeOf(display, onScreen).container.renderable).toBe(true);
        expect(nodeOf(display, offScreen).container.renderable).toBe(false);
        expect(nodeOf(display, touching).container.renderable).toBe(true);
    });

    test('a group fully off screen skips its subtree without visiting it', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world);
        const child = addShape(level, group, SQUARE);
        group.requireComponent(TransformComponent).set('position', { x: 1000, y: 0 });
        const { display } = makeDisplay(level);
        const childNode = nodeOf(display, child);

        display.cull(VISIBLE_AREA);

        // Left as it was: a child that had been visited would have been set to false.
        expect(nodeOf(display, group).container.renderable).toBe(false);
        expect(childNode.container.renderable).toBe(true);
    });

    test('a group on screen through a child draws the child but not its own off-screen drawing', () => {
        const level = Level.createNew();
        const parent = addShape(level, level.world, SQUARE);
        const child = addShape(level, parent, SQUARE);
        parent.requireComponent(TransformComponent).set('position', { x: 400, y: 0 });
        child.requireComponent(TransformComponent).set('position', { x: -400, y: 0 });
        const { display } = makeDisplay(level);

        display.cull(VISIBLE_AREA);

        const parentNode = nodeOf(display, parent);
        expect(parentNode.container.renderable).toBe(true);
        expect(parentNode.graphics.renderable).toBe(false);
        expect(nodeOf(display, child).container.renderable).toBe(true);
    });

    test('panning back, or moving an entity back, shows it again', () => {
        const level = Level.createNew();
        const square = addShape(level, level.world, SQUARE);
        const { display } = makeDisplay(level);
        const node = nodeOf(display, square);

        display.cull(new Bounds(1000, 1000, 1200, 1200));
        expect(node.container.renderable).toBe(false);

        display.cull(VISIBLE_AREA);
        expect(node.container.renderable).toBe(true);

        square.requireComponent(TransformComponent).set('position', { x: 900, y: 0 });
        display.cull(VISIBLE_AREA);
        expect(node.container.renderable).toBe(false);

        square.requireComponent(TransformComponent).set('position', { x: 0, y: 0 });
        display.cull(VISIBLE_AREA);
        expect(node.container.renderable).toBe(true);
    });

    test('a move with the area unchanged culls the moved entity, its subtree and its parents', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world);
        const child = addShape(level, group, SQUARE);
        const grandchild = addShape(level, child, SQUARE);
        const sibling = addShape(level, group, SQUARE, 1);
        group.requireComponent(TransformComponent).set('position', { x: 1000, y: 0 });
        sibling.requireComponent(TransformComponent).set('position', { x: 500, y: 0 });
        const { display } = makeDisplay(level);
        display.cull(VISIBLE_AREA);
        expect(nodeOf(display, group).container.renderable).toBe(false);

        // The child comes on screen inside an off-screen group: the group is culled whole, so the
        // sibling it had skipped is set too.
        child.requireComponent(TransformComponent).set('position', { x: -1000, y: 0 });
        display.cull(VISIBLE_AREA);
        expect(nodeOf(display, group).container.renderable).toBe(true);
        expect(nodeOf(display, child).container.renderable).toBe(true);
        expect(nodeOf(display, grandchild).container.renderable).toBe(true);
        expect(nodeOf(display, sibling).container.renderable).toBe(false);

        child.requireComponent(TransformComponent).set('position', { x: 0, y: 0 });
        display.cull(VISIBLE_AREA);
        expect(nodeOf(display, group).container.renderable).toBe(false);
    });

    test('showing a hidden group again culls its subtree', () => {
        const level = Level.createNew();
        const group = addGroup(level, level.world);
        const child = addShape(level, group, SQUARE);
        const { display } = makeDisplay(level);
        group.setHidden(true);
        display.cull(VISIBLE_AREA);

        child.requireComponent(TransformComponent).set('position', { x: 900, y: 0 });
        display.cull(VISIBLE_AREA);
        group.setHidden(false);
        display.cull(VISIBLE_AREA);

        expect(nodeOf(display, group).container.renderable).toBe(false);
    });

    test('a group that draws nothing in its subtree is skipped', () => {
        const level = Level.createNew();
        const emptyGroup = addGroup(level, level.world);
        const { display } = makeDisplay(level);

        display.cull(VISIBLE_AREA);

        expect(nodeOf(display, emptyGroup).container.renderable).toBe(false);
    });
});

describe('LevelDisplay on screen', () => {
    let renderer: Renderer | undefined;

    afterEach(() => {
        renderer?.destroy();
        renderer = undefined;
    });

    function pixelAt(target: Renderer, display: LevelDisplay, x: number, y: number) {
        const frame = new Rectangle(x, y, 1, 1);
        const { pixels } = target.extract.pixels({ target: display.root, frame });

        return [...pixels.slice(0, 4)];
    }

    test('a test level draws the background and a shape in front of it', async () => {
        renderer = await autoDetectRenderer({ preference: ['webgl', 'canvas'], width: 200, height: 200 });
        const level = Level.createNew();
        const square = addShape(level, level.world, { kind: 'rectangle', width: 40, height: 40 });
        square.requireComponent(StyleComponent).set('fill', { kind: 'solid', colour: '#FF0000FF' });
        square.requireComponent(StyleComponent).set('outlineWidth', 0);
        square.requireComponent(TransformComponent).set('position', { x: 50, y: 50 });
        const { display } = makeDisplay(level);
        display.prepare();

        const insideSquare = pixelAt(renderer, display, 50, 50);
        const background = pixelAt(renderer, display, 150, 150);

        expect(insideSquare).toEqual([255, 0, 0, 255]);
        expect(background).toEqual([0xbf, 0xe3, 0xf5, 255]);
    });
});

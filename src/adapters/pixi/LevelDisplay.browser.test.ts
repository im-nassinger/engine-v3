import { autoDetectRenderer, Rectangle } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import { afterEach, describe, expect, test } from 'vitest';
import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import { PiecesCache } from '../../core/derived/index.ts';
import type { Entity } from '../../core/entities/index.ts';
import { Level } from '../../core/entities/index.ts';
import type { ShapeGeometry } from '../../core/geometry/index.ts';
import { LevelDisplay } from './LevelDisplay.ts';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function makeDisplay(level: Level, showUnstyled = true) {
    const pieces = new PiecesCache(level);
    let changeCount = 0;
    const display = new LevelDisplay({
        level,
        caches: { pieces },
        options: { showUnstyled },
        onChange: () => {
            changeCount += 1;
        },
    });
    cleanups.push(() => {
        display.dispose();
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

        const drawnChildren = node.childrenLayer.children.map((container) => {
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

    test('a shape with no StyleComponent draws a thin line in the editor and nothing in play', () => {
        const editorLevel = Level.createNew();
        const editorShape = addShape(editorLevel, editorLevel.world, SQUARE);
        editorShape.removeComponent(StyleComponent);
        const editor = makeDisplay(editorLevel, true);
        editor.display.prepare();

        const playLevel = Level.createNew();
        const playShape = addShape(playLevel, playLevel.world, SQUARE);
        playShape.removeComponent(StyleComponent);
        const play = makeDisplay(playLevel, false);
        play.display.prepare();

        const editorBounds = editor.display.nodeOf(editorShape)?.graphics.getLocalBounds();
        const playBounds = play.display.nodeOf(playShape)?.graphics.getLocalBounds();

        expect(editorBounds?.width).toBeGreaterThan(99);
        expect(playBounds?.width).toBe(0);
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
        const circle = addShape(level, level.world, { kind: 'ellipse', width: 80, height: 80 });
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

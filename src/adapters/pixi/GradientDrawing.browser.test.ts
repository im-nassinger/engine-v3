import { autoDetectRenderer, Rectangle } from 'pixi.js';
import type { Renderer } from 'pixi.js';
import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { PathComponent, ShapeComponent, StyleComponent, TransformComponent } from '../../core/components/index.ts';
import { BoundsCache, PiecesCache, WorldMatrixCache } from '../../core/derived/index.ts';
import type { Fill } from '../../core/fields/index.ts';
import type { Entity } from '../../core/level/index.ts';
import { Level } from '../../core/level/index.ts';
import type { PathPoint, Point, ShapeGeometry } from '../../core/geometry/index.ts';
import { LevelDisplay } from './LevelDisplay.ts';

// The World's default sky, behind every shape here.
const BACKGROUND = [0xbf, 0xe3, 0xf5];
const RED = '#FF0000FF';
const BLUE = '#0000FFFF';
// The gradient's texture is 256 pixels across, and the GPU filters it: a few steps of 255 either way.
const CHANNEL_TOLERANCE = 6;

let renderer: Renderer;
const cleanups: (() => void)[] = [];

beforeAll(async () => {
    renderer = await autoDetectRenderer({ preference: ['webgl', 'canvas'], width: 300, height: 300 });
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function makeDisplay(level: Level) {
    const pieces = new PiecesCache(level);
    const worldMatrices = new WorldMatrixCache(level);
    const bounds = new BoundsCache(level, worldMatrices);
    const display = new LevelDisplay({
        level,
        caches: { pieces, bounds, worldMatrices },
        options: { showUnstyled: true },
        onChange: () => undefined,
    });
    cleanups.push(() => {
        display.dispose();
        bounds.dispose();
        worldMatrices.dispose();
        pieces.dispose();
    });

    return display;
}

function styled(entity: Entity, fill: Fill, position: Point) {
    entity.addComponent(new TransformComponent());
    entity.requireComponent(TransformComponent).set('position', position);
    const style = new StyleComponent();
    entity.addComponent(style);
    style.set('fill', fill);
    style.set('outlineWidth', 0);

    return entity;
}

function addShape(level: Level, geometry: ShapeGeometry, fill: Fill, position: Point) {
    const entity = level.createEntity(level.world, 0);
    entity.addComponent(new ShapeComponent({ geometry }));

    return styled(entity, fill, position);
}

function linear(start: Point, end: Point, first = RED, last = BLUE): Fill {
    const stops = [
        { colour: first, place: 0 },
        { colour: last, place: 1 },
    ];

    return { kind: 'linear', stops, start, end };
}

const LEFT_TO_RIGHT = linear({ x: 0, y: 0.5 }, { x: 1, y: 0.5 });

// The colour at a level position, its alpha left out: everything here is drawn over the opaque sky.
function colourAt(display: LevelDisplay, x: number, y: number) {
    display.prepare();
    const frame = new Rectangle(x, y, 1, 1);
    const { pixels } = renderer.extract.pixels({ target: display.root, frame });

    return [...pixels.slice(0, 3)];
}

// Red to blue at a share along the gradient.
function redToBlue(share: number) {
    return [255 * (1 - share), 0, 255 * share];
}

function expectColour(actual: number[], expected: number[]) {
    const furthest = Math.max(...actual.map((channel, index) => Math.abs(channel - (expected[index] ?? 0))));
    expect(furthest, `${actual.join(',')} should be near ${expected.map(Math.round).join(',')}`).toBeLessThanOrEqual(
        CHANNEL_TOLERANCE,
    );
}

describe('a gradient drawn by PixiJS', () => {
    test('a linear gradient runs across a rectangle from start to end', () => {
        const level = Level.createNew();
        // From x 50 to 150.
        addShape(level, { kind: 'rectangle', width: 100, height: 40 }, LEFT_TO_RIGHT, { x: 100, y: 50 });
        const display = makeDisplay(level);

        expectColour(colourAt(display, 55, 50), redToBlue(0.055));
        expectColour(colourAt(display, 100, 40), redToBlue(0.505));
        expectColour(colourAt(display, 145, 60), redToBlue(0.955));
    });

    test('a linear gradient going up and to the right runs that way', () => {
        const level = Level.createNew();
        const upRight = linear({ x: 0, y: 1 }, { x: 1, y: 0 });
        // From 50 to 150 both ways.
        addShape(level, { kind: 'rectangle', width: 100, height: 100 }, upRight, { x: 100, y: 100 });
        const display = makeDisplay(level);

        expectColour(colourAt(display, 55, 145), redToBlue(0.055));
        expectColour(colourAt(display, 55, 55), redToBlue(0.505));
        expectColour(colourAt(display, 145, 55), redToBlue(0.955));
    });

    test('a radial gradient on a long rectangle is an ellipse touching its sides', () => {
        const level = Level.createNew();
        const stops = [
            { colour: '#FFFFFFFF', place: 0 },
            { colour: '#000000FF', place: 1 },
        ];
        const radial: Fill = { kind: 'radial', stops, centre: { x: 0.5, y: 0.5 }, radius: 0.5 };
        // 200 wide and 100 high around 150, 150: the ellipse's radii are 100 and 50.
        addShape(level, { kind: 'rectangle', width: 200, height: 100 }, radial, { x: 150, y: 150 });
        const display = makeDisplay(level);

        const grey = (share: number) => [255 * (1 - share), 255 * (1 - share), 255 * (1 - share)];
        expectColour(colourAt(display, 150, 150), grey(0.01));
        expectColour(colourAt(display, 200, 150), grey(0.505));
        expectColour(colourAt(display, 150, 175), grey(0.51));
        // Past the ellipse, in the corner, is the last stop.
        expectColour(colourAt(display, 245, 195), grey(1));
    });

    test('a turned rectangle turns its gradient with it', () => {
        const level = Level.createNew();
        const turned = addShape(level, { kind: 'rectangle', width: 100, height: 40 }, LEFT_TO_RIGHT, {
            x: 100,
            y: 100,
        });
        turned.requireComponent(TransformComponent).set('rotation', 90);
        const display = makeDisplay(level);

        // A quarter turn clockwise on screen, y pointing down: its own left end is now at the top.
        expectColour(colourAt(display, 100, 55), redToBlue(0.055));
        expectColour(colourAt(display, 100, 145), redToBlue(0.955));
    });

    test('a scaled shape with Scale outline off places its gradient as with it on', () => {
        const level = Level.createNew();
        const stretched = addShape(level, { kind: 'rectangle', width: 50, height: 40 }, LEFT_TO_RIGHT, {
            x: 100,
            y: 100,
        });
        stretched.requireComponent(TransformComponent).set('scale', { x: 2, y: 1 });
        stretched.requireComponent(TransformComponent).set('skew', 0.3);
        const style = stretched.requireComponent(StyleComponent);
        style.set('outlineWidth', 1);
        style.set('scaleOutline', false);
        const display = makeDisplay(level);
        const scaledOff = colourAt(display, 120, 100);

        style.set('scaleOutline', true);

        expectColour(scaledOff, colourAt(display, 120, 100));
        expectColour(scaledOff, redToBlue(0.705));
    });

    test('a see-through stop shows the background through it', () => {
        const level = Level.createNew();
        const fading = linear({ x: 0, y: 0.5 }, { x: 1, y: 0.5 }, RED, '#FF000000');
        addShape(level, { kind: 'rectangle', width: 100, height: 40 }, fading, { x: 100, y: 50 });
        const display = makeDisplay(level);

        // Half way, the stop is half see-through: half red, half sky.
        const halfRed = BACKGROUND.map((channel, index) => (index === 0 ? 255 : 0) * 0.5 + channel * 0.5);
        expectColour(colourAt(display, 100, 50), halfRed);
        expectColour(colourAt(display, 149, 50), BACKGROUND);
    });

    test('a concave polygon is one gradient across all its pieces', () => {
        const level = Level.createNew();
        // An L from 0 to 100 both ways, its notch at the top right.
        const points = [
            { x: 0, y: 0 },
            { x: 40, y: 0 },
            { x: 40, y: 60 },
            { x: 100, y: 60 },
            { x: 100, y: 100 },
            { x: 0, y: 100 },
        ];
        addShape(level, { kind: 'polygon', points }, LEFT_TO_RIGHT, { x: 50, y: 50 });
        const display = makeDisplay(level);

        expectColour(colourAt(display, 70, 120), redToBlue(0.205));
        expectColour(colourAt(display, 120, 130), redToBlue(0.705));
        expectColour(colourAt(display, 70, 50), redToBlue(0.205));
    });

    test("a closed path fills its curve's box, not its handles'", () => {
        const level = Level.createNew();
        const sharp = { handleIn: null, handleOut: null, corner: 'sharp' } as const;
        // A curve from 0, 0 to 100, 0 bulging down to 30, its handles reaching 40, closed by a line.
        const points: PathPoint[] = [
            { x: 0, y: 0, ...sharp, handleOut: { x: 0, y: 40 } },
            { x: 100, y: 0, ...sharp, handleIn: { x: 0, y: 40 } },
        ];
        const entity = level.createEntity(level.world, 0);
        entity.addComponent(new PathComponent({ path: { closed: true, points } }));
        styled(entity, linear({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }), { x: 100, y: 100 });
        const display = makeDisplay(level);

        expectColour(colourAt(display, 150, 101), redToBlue(0.05));
        expectColour(colourAt(display, 150, 128), redToBlue(0.95));
    });
});

describe('GradientTextures through the display', () => {
    test('equal fills share one texture, released when the last one goes', () => {
        const level = Level.createNew();
        const square: ShapeGeometry = { kind: 'rectangle', width: 40, height: 40 };
        const first = addShape(level, square, LEFT_TO_RIGHT, { x: 50, y: 50 });
        const second = addShape(level, square, LEFT_TO_RIGHT, { x: 150, y: 50 });
        const display = makeDisplay(level);
        display.prepare();
        expect(display.gradientTextureCount).toBe(1);

        second.requireComponent(StyleComponent).set('fill', linear({ x: 0, y: 0 }, { x: 1, y: 1 }, BLUE, RED));
        display.prepare();
        expect(display.gradientTextureCount).toBe(2);

        first.requireComponent(StyleComponent).set('fill', { kind: 'solid', colour: RED });
        display.prepare();
        expect(display.gradientTextureCount).toBe(1);

        level.removeEntity(second);
        display.prepare();
        expect(display.gradientTextureCount).toBe(0);
    });

    test('a redraw with the same gradient keeps its texture', () => {
        const level = Level.createNew();
        const square = addShape(level, { kind: 'rectangle', width: 40, height: 40 }, LEFT_TO_RIGHT, { x: 50, y: 50 });
        const display = makeDisplay(level);
        display.prepare();

        square.requireComponent(ShapeComponent).set('geometry', { kind: 'rectangle', width: 60, height: 40 });
        display.prepare();

        expect(display.gradientTextureCount).toBe(1);
        expectColour(colourAt(display, 25, 50), redToBlue(0.08));
    });
});

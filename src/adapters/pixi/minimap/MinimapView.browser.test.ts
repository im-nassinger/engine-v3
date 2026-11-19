import { afterEach, describe, expect, test, vi } from 'vitest';
import { ShapeComponent, StyleComponent, TransformComponent } from '../../../core/components/index.ts';
import { DerivedCaches } from '../../../core/derived/index.ts';
import { Signal } from '../../../core/events/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { ManualTimer } from '../../../editor/time/testing/index.ts';
import { ViewState } from '../../../editor/view/index.ts';
import { MinimapView } from './MinimapView.ts';
import type { MinimapLevelSource } from './MinimapView.ts';

const WIDTH = 200;
const HEIGHT = 100;
// A new level is 20000 x 10000, so one picture pixel is 100 level pixels.
const LEVEL_PX_PER_PICTURE_PX = 100;
const UPDATE_MS = 250;
const SLICE_GAP_MS = 16;
// A level of the tests' 450 and more entities takes five slices: the first at once, then four gaps.
const REST_OF_PAINTING_MS = SLICE_GAP_MS * 4;
const RED = '#FF0000FF';

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

function addRectangle(level: Level, x: number, y: number, fill = RED) {
    const entity = level.createEntity(level.world, 0);
    const transform = new TransformComponent();
    const shape = new ShapeComponent();
    const style = new StyleComponent();
    entity.addComponent(transform);
    entity.addComponent(shape);
    entity.addComponent(style);
    transform.set('position', { x, y });
    shape.set('geometry', { kind: 'rectangle', width: 1_000, height: 1_000 });
    style.set('fill', { kind: 'solid', colour: fill });
    style.set('outlineWidth', 0);

    return entity;
}

async function showMinimap(level: Level) {
    const timer = new ManualTimer();
    const view = new ViewState();
    view.setSize(1_000, 500);
    const pixelRatio = {
        current: () => 1,
        onChange: (listener: (ratio: number) => void) => new Signal<number>().subscribe(listener),
    };
    const minimap = new MinimapView({ view, timer, pixelRatio });
    const openLevelChanged = new Signal<void>();
    const session: { openLevel: MinimapLevelSource['openLevel']; openLevelChanged: Signal<void> } = {
        openLevel: { level, caches: new DerivedCaches(level) },
        openLevelChanged,
    };
    const host = document.createElement('div');
    host.style.cssText = `width: ${WIDTH}px; height: ${HEIGHT}px;`;
    document.body.append(host);
    cleanups.push(() => {
        minimap.destroy();
        host.remove();
    });

    minimap.follow(session);
    minimap.mount(host);
    await vi.waitFor(() => expect(minimap.canvas.width).toBe(WIDTH));

    return { minimap, timer, view, session, openLevelChanged };
}

function pixelAt(minimap: MinimapView, levelX: number, levelY: number) {
    const context = minimap.canvas.getContext('2d');
    if (context === null) throw new Error('The minimap has no 2D canvas.');

    const x = WIDTH / 2 + levelX / LEVEL_PX_PER_PICTURE_PX;
    const y = HEIGHT / 2 + levelY / LEVEL_PX_PER_PICTURE_PX;

    return [...context.getImageData(x, y, 1, 1).data];
}

function isRed(pixel: number[]) {
    const [red = 0, green = 0, blue = 0] = pixel;

    return red > 200 && green < 60 && blue < 60;
}

// A view far from the shapes the tests read, whose rectangle covers nothing they look at.
function lookAway(view: ViewState) {
    view.place({ x: -9_000, y: -4_500 }, 1);
}

describe('MinimapView', () => {
    test('paints a filled shape where it is in the level bounds', async () => {
        const level = Level.createNew();
        addRectangle(level, 3_000, 1_000);
        const { minimap, view, timer } = await showMinimap(level);
        lookAway(view);
        timer.advance(UPDATE_MS);

        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(true);
        expect(isRed(pixelAt(minimap, -3_000, 1_000))).toBe(false);
    });

    test('draws no outline', async () => {
        const level = Level.createNew();
        const entity = addRectangle(level, 3_000, 1_000, '#00000000');
        const style = entity.requireComponent(StyleComponent);
        style.set('outlineWidth', 500);
        style.set('outlineColour', RED);
        const { minimap, view, timer } = await showMinimap(level);
        lookAway(view);
        timer.advance(UPDATE_MS);

        expect(isRed(pixelAt(minimap, 3_500, 1_000))).toBe(false);
    });

    test('leaves out a hidden entity', async () => {
        const level = Level.createNew();
        const entity = addRectangle(level, 3_000, 1_000);
        entity.setHidden(true);
        const { minimap, view, timer } = await showMinimap(level);
        lookAway(view);
        timer.advance(UPDATE_MS);

        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(false);
    });

    test('many changes within the wait paint once, a quarter of a second later', async () => {
        const level = Level.createNew();
        const entity = addRectangle(level, 3_000, 1_000);
        const { minimap, timer } = await showMinimap(level);
        const before = minimap.paintingCount;
        const transform = entity.requireComponent(TransformComponent);

        transform.set('position', { x: 3_100, y: 1_000 });
        transform.set('position', { x: -3_000, y: 1_000 });
        timer.advance(UPDATE_MS - 1);
        expect(minimap.paintingCount).toBe(before);

        timer.advance(1);
        expect(minimap.paintingCount).toBe(before + 1);
        expect(isRed(pixelAt(minimap, -3_000, 1_000))).toBe(true);
    });

    test('an entity added later is painted, in front of the older ones', async () => {
        const level = Level.createNew();
        addRectangle(level, 3_000, 1_000, '#0000FFFF');
        const { minimap, timer } = await showMinimap(level);

        addRectangle(level, 3_000, 1_000);
        timer.advance(UPDATE_MS);

        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(true);
    });

    test('an idle minimap asks for no time', async () => {
        const { timer } = await showMinimap(Level.createNew());
        timer.advance(UPDATE_MS);

        expect(timer.pendingCount).toBe(0);
    });

    test('a large level is painted in slices, and shows only when it is whole', async () => {
        const level = Level.createNew();
        const first = addRectangle(level, 3_000, 1_000);
        for (let count = 0; count < 450; count += 1) {
            addRectangle(level, -3_000, -1_000);
        }
        const { minimap, timer } = await showMinimap(level);
        timer.advance(REST_OF_PAINTING_MS);
        const before = minimap.paintingCount;

        first.requireComponent(TransformComponent).set('position', { x: -3_000, y: 1_000 });
        timer.advance(UPDATE_MS);
        expect(minimap.paintingCount).toBe(before);
        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(true);

        timer.advance(REST_OF_PAINTING_MS);
        expect(minimap.paintingCount).toBe(before + 1);
        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(false);
    });

    test('an entity removed while the painting runs is skipped', async () => {
        const level = Level.createNew();
        const others: Entity[] = [];
        for (let count = 0; count < 450; count += 1) {
            others.push(addRectangle(level, -3_000, -1_000));
        }
        // Made last, so it is the top row and painted last.
        const removed = addRectangle(level, 3_000, 1_000);
        const { minimap, timer } = await showMinimap(level);
        timer.advance(REST_OF_PAINTING_MS);
        const before = minimap.paintingCount;

        others[0]?.requireComponent(TransformComponent).set('position', { x: -3_100, y: -1_000 });
        timer.advance(UPDATE_MS);
        level.removeEntity(removed);
        timer.advance(REST_OF_PAINTING_MS);

        expect(minimap.paintingCount).toBe(before + 1);
        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(false);
    });

    test('moving the view moves the rectangle and paints no entity', async () => {
        const { minimap, timer, view } = await showMinimap(Level.createNew());
        lookAway(view);
        timer.advance(UPDATE_MS);
        const paintings = minimap.paintingCount;
        const emptyPlace = pixelAt(minimap, 5_000, 2_000);

        view.place({ x: 5_000, y: 2_000 }, 1);
        timer.advance(UPDATE_MS);

        expect(minimap.paintingCount).toBe(paintings);
        expect(pixelAt(minimap, 5_000, 2_000)).not.toEqual(emptyPlace);
    });

    test('a new open level is painted instead', async () => {
        const first = Level.createNew();
        addRectangle(first, 3_000, 1_000);
        const { minimap, timer, view, session, openLevelChanged } = await showMinimap(first);
        lookAway(view);
        timer.advance(UPDATE_MS);

        const second = Level.createNew();
        addRectangle(second, -3_000, 1_000);
        session.openLevel = { level: second, caches: new DerivedCaches(second) };
        openLevelChanged.emit();
        timer.advance(UPDATE_MS);

        expect(isRed(pixelAt(minimap, 3_000, 1_000))).toBe(false);
        expect(isRed(pixelAt(minimap, -3_000, 1_000))).toBe(true);
    });
});

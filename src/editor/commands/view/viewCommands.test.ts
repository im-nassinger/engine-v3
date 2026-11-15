import { describe, expect, test } from 'vitest';

import { CameraComponent, NameComponent, ShapeComponent, TransformComponent } from '../../../core/components/index.ts';
import { levelBoundsOf } from '../../../core/derived/index.ts';
import type { Level } from '../../../core/level/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { FIT_MARGIN_PX, MAX_ZOOM, MIN_ZOOM } from '../../view/index.ts';
import type { ViewState } from '../../view/index.ts';
import { buildCommandTestSession } from '../testing/commandTestSession.ts';

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

function buildSession() {
    const timer = new ManualTimer();
    const built = buildCommandTestSession(timer.clock, timer, new ManualFrames());
    built.session.view.setSize(VIEW_WIDTH, VIEW_HEIGHT);

    return built;
}

function addBox(level: Level, x: number, y: number, width: number, height: number) {
    const box = level.createEntity(level.world, 0);
    box.addComponent(new TransformComponent({ position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }));
    box.addComponent(new NameComponent({ name: 'Box' }));
    box.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width, height } }));

    return box;
}

// The zoom that fits a rectangle of this size, less the margin on each side.
function fittingZoom(width: number, height: number) {
    const zoomForWidth = (VIEW_WIDTH - 2 * FIT_MARGIN_PX) / width;
    const zoomForHeight = (VIEW_HEIGHT - 2 * FIT_MARGIN_PX) / height;

    return Math.min(zoomForWidth, zoomForHeight);
}

function viewOf(view: ViewState) {
    return { middle: view.middle, zoom: view.zoom };
}

describe('Zoom in, Zoom out and 100%', () => {
    test('double, halve and reset the zoom about the middle', () => {
        const { session, requireCommand } = buildSession();
        const view = session.view;

        requireCommand('view.zoomIn').run();
        expect(view.zoom).toBe(2);

        requireCommand('view.zoomOut').run();
        requireCommand('view.zoomOut').run();
        expect(view.zoom).toBe(0.5);

        requireCommand('view.zoomTo100').run();
        expect(view.zoom).toBe(1);
        expect(view.middle).toEqual({ x: 0, y: 0 });
    });

    test('are disabled at the ends of the zoom range', () => {
        const { session, requireCommand } = buildSession();

        session.view.zoomAboutMiddle(MAX_ZOOM);
        expect(requireCommand('view.zoomIn').availability()).toEqual({ enabled: false, reason: 'Already at 1000%' });
        expect(requireCommand('view.zoomIn').run()).toEqual({ kind: 'refused', reason: 'Already at 1000%' });

        session.view.zoomAboutMiddle(MIN_ZOOM);
        expect(requireCommand('view.zoomOut').availability()).toEqual({ enabled: false, reason: 'Already at 1%' });
        expect(requireCommand('view.zoomIn').availability()).toEqual({ enabled: true });
    });
});

describe('Selection (F)', () => {
    test('fits the selected entities with their children', () => {
        const { session, requireCommand, level } = buildSession();
        const left = addBox(level, 0, 0, 100, 100);
        const right = addBox(level, 300, 0, 100, 100);
        session.openLevel.selection.replace([left.id, right.id]);

        requireCommand('view.fitSelection').run();

        expect(session.view.middle.x).toBeCloseTo(150);
        expect(session.view.middle.y).toBeCloseTo(0);
        expect(session.view.zoom).toBeCloseTo(fittingZoom(400, 100));
    });

    test('fits the whole level with nothing selected', () => {
        const { session, requireCommand, level } = buildSession();
        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) throw new Error('No level bounds.');

        requireCommand('view.fitSelection').run();

        expect(session.view.middle).toEqual({ x: 0, y: 0 });
        expect(session.view.zoom).toBeCloseTo(fittingZoom(levelBounds.width, levelBounds.height));
    });

    test('centres on a group that draws nothing, keeping the zoom', () => {
        const { session, requireCommand, level } = buildSession();
        const emptyGroup = level.createEntity(level.world, 0);
        emptyGroup.addComponent(
            new TransformComponent({ position: { x: 70, y: -30 }, rotation: 0, scale: { x: 1, y: 1 }, skew: 0 }),
        );
        session.openLevel.selection.replace([emptyGroup.id]);

        requireCommand('view.fitSelection').run();

        expect(viewOf(session.view)).toEqual({ middle: { x: 70, y: -30 }, zoom: 1 });
    });
});

describe('Whole level and Camera frame', () => {
    test('Whole level fits the World’s rectangle', () => {
        const { session, requireCommand, level, square } = buildSession();
        const levelBounds = levelBoundsOf(level);
        if (levelBounds === undefined) throw new Error('No level bounds.');
        session.openLevel.selection.replace([square.id]);

        requireCommand('view.fitWholeLevel').run();

        expect(session.view.middle).toEqual(levelBounds.centre);
        expect(session.view.zoom).toBeCloseTo(fittingZoom(levelBounds.width, levelBounds.height));
    });

    test('Camera frame fits the camera’s frame, wherever the camera is', () => {
        const { session, requireCommand, level } = buildSession();
        level.camera.requireComponent(TransformComponent).set('position', { x: 500, y: 200 });
        const camera = level.camera.requireComponent(CameraComponent);

        requireCommand('view.fitCameraFrame').run();

        expect(session.view.middle).toEqual({ x: 500, y: 200 });
        expect(session.view.zoom).toBeCloseTo(fittingZoom(camera.get('width'), camera.get('height')));
    });
});

describe('The View menu switches', () => {
    test('flip ViewSettings and say whether they are on', () => {
        const { session, requireCommand } = buildSession();
        const settings = session.viewSettings;
        const switches = [
            ['view.grid', 'grid'],
            ['view.jointIcons', 'jointIcons'],
            ['view.cameraFrame', 'cameraFrame'],
            ['view.physicsView', 'physicsView'],
        ] as const;

        for (const [commandId, viewSwitch] of switches) {
            const command = requireCommand(commandId);
            const wasOn = settings.isOn(viewSwitch);

            command.run();

            expect(settings.isOn(viewSwitch)).toBe(!wasOn);
            expect(command.checked?.()).toBe(!wasOn);
        }
    });
});

describe('Every View command', () => {
    test('makes no undo step and leaves the level as it was', () => {
        const { session, registry } = buildSession();
        const viewCommands = registry.menu('View');

        for (const command of viewCommands) {
            command.run();
        }

        expect(viewCommands).toHaveLength(10);
        expect(session.openLevel.history.undoLabel).toBeUndefined();
    });
});

import { ShapeComponent, StyleComponent, TransformComponent } from '../../../../core/components/index.ts';
import type { Point, ShapeGeometry } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import { createCommandRegistry } from '../../../commands/index.ts';
import { EditorSession } from '../../../session/index.ts';
import type { SnapResult, Snapper } from '../../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../../time/testing/index.ts';
import type { LevelPointerInput, Modifiers, ToolKey } from '../../Tool.ts';

import { SelectTool } from '../SelectTool.ts';

export const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

// An L, so the notch at its bottom right is empty space inside its frame.
const L_POINTS: readonly Point[] = [
    { x: -100, y: -100 },
    { x: 100, y: -100 },
    { x: 100, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: -100, y: 100 },
];

// The L polygon centred at 300, 300 (its points at 200, 200 to 400, 400 in the level), a line from 600, 300
// to 700, 300 and a 100 px square at 100, 500. At zoom 1 screen and level positions are the same.
export function buildPointTest(snapper: Snapper = NO_SNAPPING) {
    const level = Level.createNew();
    const addShape = (position: Point, geometry: ShapeGeometry) => {
        const entity = level.createEntity(level.world, 0);
        const transform = new TransformComponent();
        transform.set('position', position);
        entity.addComponent(transform);
        entity.addComponent(new ShapeComponent({ geometry }));
        entity.addComponent(new StyleComponent());

        return entity;
    };
    const polygon = addShape({ x: 300, y: 300 }, { kind: 'polygon', points: L_POINTS });
    const line = addShape(
        { x: 650, y: 300 },
        {
            kind: 'line',
            points: [
                { x: -50, y: 0 },
                { x: 50, y: 0 },
            ],
        },
    );
    const square = addShape({ x: 100, y: 500 }, { kind: 'rectangle', width: 100, height: 100 });

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    session.view.centreOn({ x: 400, y: 300 });
    const tool = new SelectTool();
    tool.activate({
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper,
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
        finished: () => {},
    });

    // A press and release at a level position, the screen position worked out at the view's zoom.
    const pointerAt = (position: Point, options: Partial<Modifiers> & { clickCount?: number } = {}) => {
        const input: LevelPointerInput = {
            levelPosition: position,
            screenPosition: session.view.levelToScreen(position),
            button: 'left',
            modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? false },
            clickCount: options.clickCount ?? 1,
        };

        return input;
    };
    const click = (position: Point, options: Partial<Modifiers> & { clickCount?: number } = {}) => {
        const input = pointerAt(position, options);
        tool.pointerDown(input);
        tool.pointerUp(input);
    };
    const doubleClick = (position: Point) => {
        click(position);
        click(position, { clickCount: 2 });
    };
    const drag = (from: Point, to: Point, options: Partial<Modifiers> = {}) => {
        tool.pointerDown(pointerAt(from, options));
        tool.pointerMove(pointerAt(to, options));
        tool.pointerUp(pointerAt(to, options));
    };

    // A key going down over the level view; true when the tool used it.
    const pressKey = (code: string, modifiers: Partial<Modifiers> = {}) => {
        const key: ToolKey = {
            code,
            key: code,
            ctrl: modifiers.ctrl ?? false,
            shift: modifiers.shift ?? false,
            alt: modifiers.alt ?? false,
            repeat: false,
        };

        return tool.keyDown(key);
    };

    return { level, polygon, line, square, session, tool, click, doubleClick, drag, pointerAt, pressKey };
}

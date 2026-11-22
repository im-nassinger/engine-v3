import { ShapeComponent, StyleComponent, TransformComponent } from '../../../../core/components/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { createCommandRegistry } from '../../../commands/index.ts';
import { EditorSession } from '../../../session/index.ts';
import type { SnapResult, Snapper } from '../../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../../time/testing/index.ts';
import { PanGesture } from '../../pan/PanGesture.ts';
import { SelectTool } from '../../select/SelectTool.ts';
import type { LevelPointerInput, Modifiers, Tool, ToolKey } from '../../Tool.ts';
import { ToolController } from '../../ToolController.ts';
import { ShapeTool } from '../ShapeTool.ts';

// Rounds a point to the nearest 10 px, unless Ctrl is held.
export const TENS_SNAPPER: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point, _view, options): SnapResult => {
        if (options.ctrlHeld) return { point, snappedX: false, snappedY: false };

        const snapped = { x: Math.round(point.x / 10) * 10, y: Math.round(point.y / 10) * 10 };

        return { point: snapped, snappedX: true, snappedY: true };
    },
};

const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

// A level with a square selected and a group at 400, 300 turned 90°, the Select and Shape tools under
// one controller, and the Shape tool picked. Screen and level positions are the same.
export function buildShapeTest(snapper: Snapper = NO_SNAPPING) {
    return buildDrawingToolTest(new ShapeTool(), snapper);
}

// The same, with another drawing tool in the Shape tool's place, such as the Trigger tool.
export function buildDrawingToolTest<T extends Tool>(tool: T, snapper: Snapper = NO_SNAPPING) {
    const level = Level.createNew();
    const square = level.createEntity(level.world, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new ShapeComponent({ geometry: { kind: 'rectangle', width: 10, height: 10 } }));
    square.addComponent(new StyleComponent());
    const group = level.createEntity(level.world, 0);
    group.addComponent(
        new TransformComponent({ position: { x: 400, y: 300 }, rotation: 90, scale: { x: 1, y: 1 }, skew: 0 }),
    );

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    session.openLevel.selection.replace([square.id]);
    const services = {
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper,
        commands: createCommandRegistry(session),
        status: session.status,
        reader: session.reader,
    };
    const controller = new ToolController([new SelectTool(), tool], services, new PanGesture(session.view));
    controller.pick(tool.id);

    return { level, square, group, session, tool, controller };
}

export type Setup = ReturnType<typeof buildShapeTest>;

// What the pointer helpers below need, whichever tool is picked.
type AnySetup = Pick<Setup, 'controller' | 'session' | 'level'>;

export function pointer(position: Point, modifiers: Partial<Modifiers> = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: modifiers.shift ?? false, alt: modifiers.alt ?? false, ctrl: modifiers.ctrl ?? false },
        clickCount: 1,
    };
}

export function click(setup: AnySetup, at: Point, modifiers: Partial<Modifiers> = {}) {
    setup.controller.pointerMove(pointer(at, modifiers));
    setup.controller.pointerDown(pointer(at, modifiers));
    setup.controller.pointerUp(pointer(at, modifiers));
}

export function drag(setup: AnySetup, from: Point, to: Point, modifiers: Partial<Modifiers> = {}) {
    setup.controller.pointerDown(pointer(from, modifiers));
    setup.controller.pointerMove(pointer(to, modifiers));
    setup.controller.pointerUp(pointer(to, modifiers));
}

// The shape just made: the one selected.
export function made(setup: AnySetup): Entity {
    const ids = setup.session.openLevel.selection.ids;
    if (ids.length !== 1) throw new Error(`${String(ids.length)} entities are selected.`);

    return setup.level.requireEntity(ids[0] ?? 0);
}

export function geometryOf(entity: Entity) {
    return entity.requireComponent(ShapeComponent).get('geometry');
}

export function positionOf(entity: Entity) {
    return entity.requireComponent(TransformComponent).get('position');
}

export const ENTER: ToolKey = { code: 'Enter', key: 'Enter', ctrl: false, shift: false, alt: false, repeat: false };

// A letter key as a US layout sends it, with Shift typing the capital.
export function letter(key: string, modifiers: Partial<Pick<ToolKey, 'ctrl' | 'shift' | 'alt'>> = {}): ToolKey {
    const shift = modifiers.shift ?? false;

    return {
        code: `Key${key.toUpperCase()}`,
        key: shift ? key.toUpperCase() : key,
        ctrl: modifiers.ctrl ?? false,
        shift,
        alt: modifiers.alt ?? false,
        repeat: false,
    };
}

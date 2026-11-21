import { PathComponent, TransformComponent } from '../../../../core/components/index.ts';
import type { PathGeometry, Point } from '../../../../core/geometry/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import type { Snapper } from '../../../snapping/index.ts';
import { SelectTool } from '../../select/SelectTool.ts';
import { buildSessionWithTools } from '../../testing/toolTestSession.ts';
import type { LevelPointerInput, Modifiers, PointerButton, ToolKey } from '../../Tool.ts';
import { PenTool } from '../PenTool.ts';

// The Select tool and the pen under one controller, the pen picked, through the tool test session.
export function buildPenTest(snapper?: Snapper) {
    const pen = new PenTool();
    const setup = buildSessionWithTools([new SelectTool(), pen], snapper);
    setup.controller.pick('pen');

    return { ...setup, pen };
}

export type PenSetup = ReturnType<typeof buildPenTest>;

export type PointerOptions = Partial<Modifiers> & {
    readonly button?: PointerButton;
    readonly clickCount?: number;
};

export function pointer(position: Point, options: PointerOptions = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: options.button ?? 'left',
        modifiers: { shift: options.shift ?? false, alt: options.alt ?? false, ctrl: options.ctrl ?? false },
        clickCount: options.clickCount ?? 1,
    };
}

export function click(setup: PenSetup, at: Point, options: PointerOptions = {}) {
    setup.controller.pointerMove(pointer(at, options));
    setup.controller.pointerDown(pointer(at, options));
    setup.controller.pointerUp(pointer(at, options));
}

export function clicks(setup: PenSetup, points: readonly Point[]) {
    for (const point of points) {
        click(setup, point);
    }
}

// Presses at from and moves to to, and releases there unless asked not to.
export function drag(setup: PenSetup, from: Point, to: Point, options: PointerOptions = {}) {
    setup.controller.pointerDown(pointer(from, options));
    setup.controller.pointerMove(pointer(to, options));
    setup.controller.pointerUp(pointer(to, options));
}

export function key(code: string, keyName: string, modifiers: Partial<Modifiers> = {}): ToolKey {
    return {
        code,
        key: keyName,
        ctrl: modifiers.ctrl ?? false,
        shift: modifiers.shift ?? false,
        alt: modifiers.alt ?? false,
        repeat: false,
    };
}

export const ENTER = key('Enter', 'Enter');
export const BACKSPACE = key('Backspace', 'Backspace');
export const SPACE = key('Space', ' ');

// The path just made: the one selected.
export function made(setup: PenSetup): Entity {
    const ids = setup.session.openLevel.selection.ids;
    if (ids.length !== 1) throw new Error(`${String(ids.length)} entities are selected.`);

    return setup.level.requireEntity(ids[0] ?? 0);
}

// The path's points in level positions, for a path made at the top of the World.
export function madePath(setup: PenSetup): PathGeometry {
    const entity = made(setup);
    const position = entity.requireComponent(TransformComponent).get('position');
    const path = entity.requireComponent(PathComponent).get('path');

    return {
        closed: path.closed,
        points: path.points.map((point) => ({ ...point, x: point.x + position.x, y: point.y + position.y })),
    };
}

export function placesOf(path: PathGeometry) {
    return path.points.map((point) => ({ x: point.x, y: point.y }));
}

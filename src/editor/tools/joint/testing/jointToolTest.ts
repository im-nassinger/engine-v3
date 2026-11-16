import {
    BodyComponent,
    JointComponent,
    NameComponent,
    ShapeComponent,
    StyleComponent,
    SurfaceComponent,
    TransformComponent,
} from '../../../../core/components/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import { Level } from '../../../../core/level/index.ts';
import type { Entity } from '../../../../core/level/index.ts';
import { createCommandRegistry } from '../../../commands/index.ts';
import { EditorSession } from '../../../session/index.ts';
import type { SnapResult, Snapper } from '../../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../../time/testing/index.ts';
import { PanGesture } from '../../pan/PanGesture.ts';
import { SelectTool } from '../../select/SelectTool.ts';
import type { LevelPointerInput, Modifiers } from '../../Tool.ts';
import { ToolController } from '../../ToolController.ts';
import { JointTool } from '../JointTool.ts';

const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

export type Physics = 'body' | 'surface' | 'none';

export type SquareOptions = {
    readonly name: string;
    readonly at: Point;
    readonly size: number;
    readonly physics?: Physics;
    readonly parent?: Entity;
};

// An empty level with the Select and Joint tools under one controller, and the Joint tool picked. Screen and
// level positions are the same at the zoom of 1.
export function buildJointTest(snapper: Snapper = NO_SNAPPING) {
    const level = Level.createNew();
    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
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
    const tool = new JointTool();
    const controller = new ToolController([new SelectTool(), tool], services, new PanGesture(session.view));
    controller.pick('joint');

    return { level, session, tool, controller };
}

export type Setup = ReturnType<typeof buildJointTest>;

// A filled square on top of its parent, a body with a surface unless told otherwise.
export function addSquare(setup: Setup, options: SquareOptions) {
    const { level } = setup;
    const square = level.createEntity(options.parent ?? level.world, 0);
    square.addComponent(new TransformComponent({ ...TransformComponent.schema.defaults(), position: options.at }));
    square.addComponent(new NameComponent({ name: options.name }));
    const geometry = { kind: 'rectangle', width: options.size, height: options.size } as const;
    square.addComponent(new ShapeComponent({ geometry }));
    square.addComponent(new StyleComponent());

    const physics = options.physics ?? 'body';
    if (physics === 'body') {
        square.addComponent(new BodyComponent());
    }
    if (physics !== 'none') {
        square.addComponent(new SurfaceComponent());
    }

    return square;
}

export function pointer(position: Point, modifiers: Partial<Modifiers> = {}): LevelPointerInput {
    return {
        levelPosition: position,
        screenPosition: position,
        button: 'left',
        modifiers: { shift: modifiers.shift ?? false, alt: modifiers.alt ?? false, ctrl: modifiers.ctrl ?? false },
        clickCount: 1,
    };
}

export function click(setup: Setup, at: Point, modifiers: Partial<Modifiers> = {}) {
    setup.controller.pointerMove(pointer(at, modifiers));
    setup.controller.pointerDown(pointer(at, modifiers));
    setup.controller.pointerUp(pointer(at, modifiers));
}

export function joints(setup: Setup) {
    return [...setup.level.entitiesInPanelOrder()].filter((entity) => entity.hasComponent(JointComponent));
}

export function onlyJoint(setup: Setup) {
    const found = joints(setup);
    const joint = found[0];
    if (found.length !== 1 || joint === undefined) throw new Error(`${String(found.length)} joints are placed.`);

    return joint;
}

// Where an end of the joint is, in level positions.
export function endInLevel(setup: Setup, joint: Entity, end: 'a' | 'b') {
    const matrix = setup.session.openLevel.caches.worldMatrices.matrixOf(joint);

    return matrix.apply(joint.requireComponent(JointComponent).get('ends')[end]);
}

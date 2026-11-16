import { NameComponent, TransformComponent } from '../../../core/components/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { Level } from '../../../core/level/index.ts';
import { createCommandRegistry } from '../../commands/index.ts';
import { EditorSession } from '../../session/index.ts';
import type { SnapResult, Snapper } from '../../snapping/index.ts';
import { ManualFrames, ManualTimer } from '../../time/testing/index.ts';
import { PanGesture } from '../pan/PanGesture.ts';
import type { LevelPointerInput, PointerButton, Tool, ToolContext, ToolId, ToolKey } from '../Tool.ts';
import { ToolController } from '../ToolController.ts';

// A tool that writes down what it heard. cancelAnswers says what cancel() returns, in turn.
export class RecordingTool implements Tool {
    readonly id: ToolId;
    readonly hint: string;
    readonly preview = new VersionCounter();
    readonly heard: string[] = [];
    readonly moves: LevelPointerInput[] = [];
    readonly usedKeys = new Set<string>();
    cancelAnswers: boolean[] = [];
    // Whether undoDrawingStep() used Ctrl+Z.
    hasDrawingStep = false;
    context: ToolContext | undefined;

    constructor(id: ToolId) {
        this.id = id;
        this.hint = `${id} hint`;
    }

    activate(context: ToolContext) {
        this.context = context;
        this.heard.push('activate');
    }

    deactivate() {
        this.heard.push('deactivate');
    }

    pointerDown(input: LevelPointerInput) {
        this.heard.push(`down ${input.button}`);
    }

    pointerMove(input: LevelPointerInput) {
        this.moves.push(input);
        this.heard.push('move');
    }

    pointerUp(input: LevelPointerInput) {
        this.heard.push(`up ${input.button}`);
    }

    keyDown(key: ToolKey) {
        this.heard.push(`keyDown ${key.code}`);

        return this.usedKeys.has(key.code);
    }

    keyUp(key: ToolKey) {
        this.heard.push(`keyUp ${key.code}`);
    }

    undoDrawingStep() {
        this.heard.push('undoDrawingStep');

        return this.hasDrawingStep;
    }

    cancel() {
        this.heard.push('cancel');

        return this.cancelAnswers.shift() ?? false;
    }
}

// Snapping isn't what these tests are about.
const NO_SNAPPING: Snapper = {
    snapMove: (_bounds, offset): SnapResult => ({ point: offset, snappedX: false, snappedY: false }),
    snapPoint: (point): SnapResult => ({ point, snappedX: false, snappedY: false }),
};

export function pointerAt(screenPosition: Point, button: PointerButton = 'left'): LevelPointerInput {
    return {
        levelPosition: screenPosition,
        screenPosition,
        button,
        modifiers: { shift: false, alt: false, ctrl: false },
        clickCount: 1,
    };
}

export function toolKey(code: string, key: string): ToolKey {
    return { code, key, ctrl: false, shift: false, alt: false, repeat: false };
}

// A level with a group holding a square, a session with an 800 x 600 view, and Select and Shape as
// recording tools.
export function buildToolTestSession() {
    const level = Level.createNew();
    const group = level.createEntity(level.world, 0);
    group.addComponent(new TransformComponent());
    group.addComponent(new NameComponent({ name: 'Group 1' }));
    const square = level.createEntity(group, 0);
    square.addComponent(new TransformComponent());
    square.addComponent(new NameComponent({ name: 'Square' }));

    const timer = new ManualTimer();
    const session = new EditorSession({ level, clock: timer.clock, timer, frames: new ManualFrames() });
    session.view.setSize(800, 600);
    const commands = createCommandRegistry(session);

    const select = new RecordingTool('select');
    const shape = new RecordingTool('shape');
    const pan = new PanGesture(session.view);
    const services = {
        get openLevel() {
            return session.openLevel;
        },
        view: session.view,
        snapper: NO_SNAPPING,
        commands,
        status: session.status,
        reader: session.reader,
    };
    const controller = new ToolController([select, shape], services, pan);

    return { level, group, square, session, commands, select, shape, pan, controller };
}

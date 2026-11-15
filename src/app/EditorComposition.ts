import {
    AnimationFrames,
    BrowserTimer,
    DevicePixelRatio,
    KeyboardInput,
    keyboardPlatform,
    SystemClock,
} from '../adapters/browser/index.ts';
import { PixiLevelView } from '../adapters/pixi/index.ts';
import { levelBoundsOf } from '../core/derived/index.ts';
import { Level } from '../core/level/index.ts';
import { CommandRunner, createCommandRegistry } from '../editor/commands/index.ts';
import type { CommandRegistry } from '../editor/commands/index.ts';
import { EditorSession } from '../editor/session/index.ts';
import { ShortcutDispatcher } from '../editor/shortcuts/index.ts';
import type { KeyboardPlatform } from '../editor/shortcuts/index.ts';

const FIT_CAMERA_FRAME = 'view.fitCameraFrame';

type EditorParts = {
    readonly session: EditorSession;
    readonly commands: CommandRegistry;
    readonly runner: CommandRunner;
    readonly platform: KeyboardPlatform;
    readonly levelView: PixiLevelView;
    readonly keyboard: KeyboardInput;
};

// The composition root: the only code that knows both the editor's rules and the browser's details.
// Stage 12 opens the saved level here instead of a new one.
export class EditorComposition {
    readonly session: EditorSession;
    readonly commands: CommandRegistry;
    readonly runner: CommandRunner;
    readonly platform: KeyboardPlatform;
    readonly levelView: PixiLevelView;
    private readonly keyboard: KeyboardInput;

    private constructor(parts: EditorParts) {
        this.session = parts.session;
        this.commands = parts.commands;
        this.runner = parts.runner;
        this.platform = parts.platform;
        this.levelView = parts.levelView;
        this.keyboard = parts.keyboard;
    }

    static async create() {
        const frames = new AnimationFrames();
        const session = new EditorSession({
            level: Level.createNew(),
            clock: new SystemClock(),
            timer: new BrowserTimer(),
            frames,
        });
        const commands = createCommandRegistry(session);
        const runner = new CommandRunner(session.status);
        const platform = keyboardPlatform(navigator.platform);
        const levelView = await PixiLevelView.create({
            view: session.view,
            settings: session.viewSettings,
            frames,
            pixelRatio: new DevicePixelRatio(),
            drawing: { showUnstyled: true },
        });
        const dispatcher = new ShortcutDispatcher(commands, runner, platform);
        const keyboard = new KeyboardInput(dispatcher, window);

        const composition = new EditorComposition({ session, commands, runner, platform, levelView, keyboard });
        composition.start();

        return composition;
    }

    private start() {
        this.levelView.follow(this.session);
        // The editor lives as long as the page, so the keyboard is never disconnected.
        this.keyboard.connect();
        this.limitPanToOpenLevel();
        this.session.openLevelChanged.subscribe(() => this.limitPanToOpenLevel());
        this.fitCameraFrameOnceSized();
    }

    // The pan limit is set when a level opens; following a change to the World's rectangle comes
    // with the tools that change it.
    private limitPanToOpenLevel() {
        const worldRectangle = levelBoundsOf(this.session.openLevel.level);
        this.session.view.setPanLimit(worldRectangle);
    }

    // A new level opens fitted to the camera frame, which needs the view's size, known only once the
    // canvas is in the page.
    private fitCameraFrameOnceSized() {
        const view = this.session.view;

        const stopWaiting = view.version.subscribe(() => {
            const { width, height } = view.size;
            const hasSize = width > 0 && height > 0;
            if (!hasSize) return;

            stopWaiting();
            this.runCommand(FIT_CAMERA_FRAME);
        });
    }

    private runCommand(id: string) {
        const command = this.commands.find(id);
        if (command === undefined) throw new Error(`No command has the id ${id}.`);

        this.runner.run(command);
    }
}

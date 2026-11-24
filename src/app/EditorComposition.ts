import {
    AnimationFrames,
    BrowserFilePicker,
    BrowserTimer,
    ClipboardBridge,
    commitFocusedField,
    DevicePixelRatio,
    FileDownload,
    FileDropTarget,
    KeyboardInput,
    keyboardPlatform,
    LocalTimeOfDay,
    PageSavingEvents,
    PageVisibility,
    PointerInput,
    SystemClock,
    TabTitle,
} from '../adapters/browser/index.ts';
import { MinimapView, PixiLevelView } from '../adapters/pixi/index.ts';
import { ImportWorkerClient, WorkerGameRunner } from '../adapters/worker/index.ts';
import {
    BrowserPersistence,
    IndexedDbLevelStore,
    LocalStorageSettings,
    WebLockTabGuard,
} from '../adapters/storage/index.ts';
import { FflateZipCodec } from '../adapters/zip/index.ts';
import { levelBoundsOf } from '../core/derived/index.ts';
import { createV1Registry } from '../core/components/index.ts';
import { FormatUpgrader, LevelReader, LevelWriter, V1_LEVEL_LIMITS } from '../core/level-data/index.ts';
import { EditorClipboard } from '../editor/clipboard/index.ts';
import { HeldKeys, PlaySession } from '../editor/play/index.ts';
import type { GameRunner } from '../editor/play/index.ts';
import {
    ClipboardEvents,
    CommandRunner,
    createCommandRegistry,
    damagedLevelQuestion,
    FileDropEvents,
    handedOverNotice,
    OpenDialog,
} from '../editor/commands/index.ts';
import type { CommandRegistry } from '../editor/commands/index.ts';
import {
    Autosave,
    EditorSettings,
    LevelExport,
    LevelImport,
    LevelOpener,
    ProjectFile,
    SaveIndicator,
} from '../editor/saving/index.ts';
import type { FileExporter, Opening, SavesNow, TabGuard } from '../editor/saving/index.ts';
import { EditorSession } from '../editor/session/index.ts';
import { ShortcutDispatcher } from '../editor/shortcuts/index.ts';
import type { KeyboardPlatform } from '../editor/shortcuts/index.ts';
import { EscapeChain, MousePosition, OpenWindowCount } from '../editor/tools/index.ts';
import type { ToolController } from '../editor/tools/index.ts';

import { createGameWorker } from './createGameWorker.ts';
import { createImportWorker } from './createImportWorker.ts';
import { createTools } from './createTools.ts';
import { EditorDrawingSource } from './EditorDrawingSource.ts';
import { EditorGradientSource } from './EditorGradientSource.ts';
import { EditorJointPreviewSource } from './EditorJointPreviewSource.ts';
import { EditorSelectionSource } from './EditorSelectionSource.ts';
import { PlayViewLink } from './PlayViewLink.ts';

const FIT_CAMERA_FRAME = 'view.fitCameraFrame';

type EditorParts = {
    readonly session: EditorSession;
    readonly settings: EditorSettings;
    readonly commands: CommandRegistry;
    readonly runner: CommandRunner;
    readonly platform: KeyboardPlatform;
    readonly levelView: PixiLevelView;
    readonly minimap: MinimapView;
    readonly keyboard: KeyboardInput;
    readonly pointer: PointerInput;
    readonly clipboardBridge: ClipboardBridge;
    readonly fileDrop: FileDropTarget;
    readonly tools: ToolController;
    readonly mouse: MousePosition;
    readonly openWindows: OpenWindowCount;
    readonly opening: Opening;
    readonly tabGuard: TabGuard;
    readonly autosave: Autosave | undefined;
    readonly saveIndicator: SaveIndicator;
    readonly pageSaving: PageSavingEvents;
    readonly tabTitle: TabTitle;
    readonly exporter: FileExporter;
    readonly gameRunner: GameRunner;
    readonly play: PlaySession;
    readonly pageVisibility: PageVisibility;
    readonly playView: PlayViewLink;
};

// The composition root: the only code that knows both the editor's rules and the browser's details.
// It takes the level from any older tab, opens the one saved in this browser and saves it with Autosave,
// until a newer tab takes the level in turn.
export class EditorComposition {
    readonly session: EditorSession;
    readonly settings: EditorSettings;
    readonly commands: CommandRegistry;
    readonly runner: CommandRunner;
    readonly platform: KeyboardPlatform;
    readonly levelView: PixiLevelView;
    readonly minimap: MinimapView;
    readonly tools: ToolController;
    readonly mouse: MousePosition;
    // The page's menus and the Entities panel's row drag report here, so Esc leaves them to close.
    readonly openWindows: OpenWindowCount;
    // What the page shows of saving: the message pill's failed save, the tab title's `*` and the leave prompt.
    readonly saveIndicator: SaveIndicator;
    // Test play: Play, Stop, Pause and Step, and what the Play bar shows.
    readonly play: PlaySession;
    private readonly opening: Opening;
    private readonly tabGuard: TabGuard;
    private readonly autosave: Autosave | undefined;
    private readonly pageSaving: PageSavingEvents;
    private readonly tabTitle: TabTitle;
    private readonly exporter: FileExporter;
    private readonly gameRunner: GameRunner;
    private readonly keyboard: KeyboardInput;
    private readonly pointer: PointerInput;
    private readonly clipboardBridge: ClipboardBridge;
    private readonly fileDrop: FileDropTarget;
    private readonly pageVisibility: PageVisibility;
    private readonly playView: PlayViewLink;

    private constructor(parts: EditorParts) {
        this.session = parts.session;
        this.settings = parts.settings;
        this.commands = parts.commands;
        this.runner = parts.runner;
        this.platform = parts.platform;
        this.levelView = parts.levelView;
        this.minimap = parts.minimap;
        this.keyboard = parts.keyboard;
        this.pointer = parts.pointer;
        this.clipboardBridge = parts.clipboardBridge;
        this.fileDrop = parts.fileDrop;
        this.tools = parts.tools;
        this.mouse = parts.mouse;
        this.openWindows = parts.openWindows;
        this.opening = parts.opening;
        this.tabGuard = parts.tabGuard;
        this.autosave = parts.autosave;
        this.saveIndicator = parts.saveIndicator;
        this.pageSaving = parts.pageSaving;
        this.tabTitle = parts.tabTitle;
        this.exporter = parts.exporter;
        this.gameRunner = parts.gameRunner;
        this.play = parts.play;
        this.pageVisibility = parts.pageVisibility;
        this.playView = parts.playView;
    }

    static async create() {
        const frames = new AnimationFrames();
        const settings = new EditorSettings(new LocalStorageSettings(), frames);
        const clock = new SystemClock();
        const timer = new BrowserTimer();
        const store = new IndexedDbLevelStore();
        const writer = new LevelWriter();
        // One registry and reader for the opening and the session, so the saved level is read as an import is.
        const registry = createV1Registry();
        const reader = new LevelReader(registry, V1_LEVEL_LIMITS, FormatUpgrader.createCurrent());
        const tabGuard = new WebLockTabGuard();
        const opening = await new LevelOpener({
            tabGuard,
            store,
            reader,
            writer,
            sessionOpen: settings.sessionOpen,
            clock,
            timeOfDay: new LocalTimeOfDay(),
        }).open();
        const session = new EditorSession({
            level: opening.level,
            registry,
            reader,
            clock,
            timer,
            frames,
            viewSettings: settings.createViewSettings(),
            foldStore: settings.foldStore,
            makeToken: () => crypto.randomUUID(),
        });
        const mouse = new MousePosition(frames);
        const clipboard = new EditorClipboard(systemClipboard());
        // Started only when the opening can save, so a kept damaged record is never written over.
        const autosave = opening.canSave
            ? new Autosave({
                  session,
                  store,
                  writer,
                  timer,
                  clock,
                  persistence: new BrowserPersistence(),
                  persistAsked: settings.persistAsked,
              })
            : undefined;
        const saving: SavesNow = autosave ?? { saveNow: () => Promise.resolve() };
        const saveIndicator = SaveIndicator.forOpening(autosave);
        const exporter = new FileDownload(window);
        const levelExport = new LevelExport({
            session,
            saving,
            projectFile: new ProjectFile(writer, new FflateZipCodec()),
            exporter,
        });
        const importer = new ImportWorkerClient(createImportWorker);
        const levelImport = new LevelImport({ importer, reader: session.reader });
        const picker = new BrowserFilePicker(window);
        const gameRunner = new WorkerGameRunner(createGameWorker);
        const dialog = new OpenDialog();
        const heldKeys = new HeldKeys();
        const play = new PlaySession({
            session,
            runner: gameRunner,
            clock,
            timer,
            frames,
            commitTyping: () => commitFocusedField(document),
            saveNow: () => saving.saveNow(),
            isDialogOpen: () => dialog.current !== undefined,
            heldKeys,
        });
        const runner = new CommandRunner(session.status, { dialog, play });
        const fileParts = {
            levelExport,
            levelImport,
            picker,
            saving,
            saveFailure: () => saveIndicator.failedSaveText,
            commitTyping: () => commitFocusedField(document),
            outcomes: runner,
        };
        const commands = createCommandRegistry(session, { clipboard, mouse }, fileParts, play);
        const platform = keyboardPlatform(navigator.platform);
        const pixelRatio = new DevicePixelRatio();
        const levelView = await PixiLevelView.create({
            view: session.view,
            settings: session.viewSettings,
            frames,
            pixelRatio,
            drawing: { showUnstyled: true },
        });
        const minimap = new MinimapView({ view: session.view, timer, pixelRatio });
        const tools = createTools(session, commands);
        const openWindows = new OpenWindowCount();
        const escape = new EscapeChain(session, tools, openWindows);
        const dispatcher = new ShortcutDispatcher(commands, runner, platform, { tools, escape });
        const keyboard = new KeyboardInput(dispatcher, window, heldKeys, play);
        const pointerParts = { tools, escape, mouse, view: session.view, platform, play };
        const pointer = new PointerInput(pointerParts, levelView.canvas, window);
        const clipboardBridge = new ClipboardBridge(new ClipboardEvents(commands, runner), window);
        const fileDrop = new FileDropTarget(new FileDropEvents(commands, runner), window);
        const sessionOpen = settings.sessionOpen;
        const pageSaving = new PageSavingEvents({ indicator: saveIndicator, saving, settings, sessionOpen }, window);
        const tabTitle = new TabTitle(session, saveIndicator, document, play);
        const pageVisibility = new PageVisibility(window);
        const playView = new PlayViewLink(play, levelView, session);

        const composition = new EditorComposition({
            session,
            settings,
            commands,
            runner,
            platform,
            levelView,
            minimap,
            keyboard,
            pointer,
            clipboardBridge,
            fileDrop,
            tools,
            mouse,
            openWindows,
            opening,
            tabGuard,
            autosave,
            saveIndicator,
            pageSaving,
            tabTitle,
            exporter,
            gameRunner,
            play,
            pageVisibility,
            playView,
        });
        composition.start();

        return composition;
    }

    private start() {
        // Before the first draw, so a reload shows the place the last session left.
        const viewRestored = this.settings.follow(this.session);
        this.levelView.follow(this.session);
        this.minimap.follow(this.session);
        this.levelView.showSelection(new EditorSelectionSource(this.session, this.tools));
        this.levelView.showDrawing(new EditorDrawingSource(this.tools));
        this.levelView.showGradientHandles(new EditorGradientSource(this.session, this.tools));
        this.levelView.showJointPreview(new EditorJointPreviewSource(this.session, this.tools, this.mouse));
        // The editor lives as long as the page, so the keyboard, the pointer, the clipboard events, file drops,
        // the page's saving events, its visibility and test play's view are never disconnected.
        this.keyboard.connect();
        this.pointer.connect();
        this.clipboardBridge.connect();
        this.fileDrop.connect();
        this.pageSaving.connect();
        this.tabTitle.connect();
        this.play.connectPage(this.pageVisibility);
        this.playView.connect();
        this.limitPanToOpenLevel();
        this.session.openLevelChanged.subscribe(() => this.limitPanToOpenLevel());
        // A new level has no place of its own yet, so a view kept from an earlier level would show nothing.
        if (this.opening.isNew || !viewRestored) {
            this.fitCameraFrameOnceSized();
        }
        this.showOpeningNotes();
        this.tabGuard.whenTakenOver(() => this.handOverLevel());
        // Loading Box2D now, while the editor is used, makes the first Play fast.
        this.gameRunner.prepare();
    }

    // The crash note or the storage notices as status text, and the damaged level's notice.
    private showOpeningNotes() {
        const statusText = this.opening.statusText;
        if (statusText !== undefined) {
            this.session.status.show(statusText);
        }

        const damaged = this.opening.damaged;
        if (damaged !== undefined) {
            this.runner.showOutcome(damagedLevelQuestion(damaged, this.exporter));
        }
    }

    // A newer tab is taking the level: the typing in a focused field is kept, every edit is refused from here
    // on, and what is unsaved is saved before the lock is let go, so the newer tab opens it.
    private async handOverLevel() {
        commitFocusedField(document);
        this.session.makeReadOnly();
        this.pageSaving.stopKeepingSessionOpen();

        let isSaved = false;
        if (this.autosave !== undefined) {
            isSaved = await this.autosave.saveLastTime();
        }

        this.saveIndicator.becomeReadOnly();
        const notice = handedOverNotice(isSaved);
        this.runner.showOutcome(notice);
    }

    // The pan limit is set when a level opens; following a change to the World's rectangle comes
    // with the tools that change it.
    private limitPanToOpenLevel() {
        const worldRectangle = levelBoundsOf(this.session.openLevel.level);
        this.session.view.setPanLimit(worldRectangle);
    }

    // With no saved view, the level opens fitted to the camera frame, which needs the view's size, known only once the
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

// The browser's asynchronous clipboard, missing outside a secure page, where copies stay in memory.
function systemClipboard() {
    const hasClipboard = 'clipboard' in navigator;
    if (!hasClipboard) return undefined;

    return navigator.clipboard;
}

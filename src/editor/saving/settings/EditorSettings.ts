import type { ComponentTypeName } from '../../../core/components/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { FoldStore } from '../../inspector/index.ts';
import type { EditorSession } from '../../session/index.ts';
import type { Cancel, FrameScheduler } from '../../time/index.ts';
import { DEFAULT_VIEW_SWITCHES, ViewSettings } from '../../view/index.ts';
import type { ViewState, ViewSwitches } from '../../view/index.ts';

import type { PersistAskedRecord } from '../contracts/PersistAskedRecord.ts';
import type { SessionOpenRecord } from '../contracts/SessionOpenRecord.ts';
import type { SettingsStore } from '../contracts/SettingsStore.ts';
import { parseSettingsText, readFoldedCards, readSavedView, readViewSwitches } from './settingsValues.ts';
import type { SavedView } from './settingsValues.ts';

// The editor's small settings, kept between sessions as one JSON object in the SettingsStore. They are read
// once, before the first draw, each key checked on its own so a damaged one gives its default and the others
// still load. Changes are written at most once a frame. Keys this class doesn't know (the later steps' own)
// are kept as they were.
export class EditorSettings {
    readonly foldStore: FoldStore;
    readonly persistAsked: PersistAskedRecord;
    readonly sessionOpen: SessionOpenRecord;
    private readonly store: SettingsStore;
    private readonly frames: FrameScheduler;
    private readonly others: Record<string, unknown>;
    private view: SavedView | undefined;
    private switches: ViewSwitches;
    private foldedCards: readonly ComponentTypeName[];
    private asked: boolean;
    private open: boolean;
    private cancelWrite: Cancel | undefined;
    private stopFollowing: Unsubscribe[] = [];

    constructor(store: SettingsStore, frames: FrameScheduler) {
        this.store = store;
        this.frames = frames;

        const storedText = store.read();
        const stored = parseSettingsText(storedText);
        this.others = stored;
        this.view = readSavedView(stored.view);
        this.switches = readViewSwitches(stored.viewSwitches, DEFAULT_VIEW_SWITCHES);
        this.foldedCards = readFoldedCards(stored.foldedCards);
        this.asked = stored.persistAsked === true;
        this.open = stored.sessionOpen === true;

        this.foldStore = {
            loadFolded: () => this.foldedCards,
            saveFolded: (folded) => {
                this.foldedCards = [...folded];
                this.writeNextFrame();
            },
        };
        const readAsked = () => this.asked;
        this.persistAsked = {
            get isAsked() {
                return readAsked();
            },
            // Written at once, not on a frame: it follows a save, which may run in a hidden tab, where the
            // browser runs no frames.
            markAsked: () => {
                this.asked = true;
                this.writeNow();
            },
        };
        const readOpen = () => this.open;
        this.sessionOpen = {
            get isOpen() {
                return readOpen();
            },
            // Written at once: it is cleared as the page goes away, when no frame will run.
            setOpen: (open) => {
                this.open = open;
                this.writeNow();
            },
        };
    }

    get savedView() {
        return this.view;
    }

    // The View menu's switches as they were saved, for the session's ViewSettings.
    createViewSettings() {
        return new ViewSettings(this.switches);
    }

    // Puts the view back where it was saved, then writes the view and the View menu's switches whenever they
    // change. Answers whether a saved view was put back, so the page fits a new level only when none was.
    follow(session: EditorSession) {
        this.stop();

        const restored = this.view !== undefined;
        if (this.view !== undefined) {
            restoreView(session.view, this.view);
        }

        const view = session.view;
        const viewSettings = session.viewSettings;
        const stopView = view.version.subscribe(() => {
            this.view = { x: view.middle.x, y: view.middle.y, zoom: view.zoom };
            this.writeNextFrame();
        });
        const stopSwitches = viewSettings.version.subscribe(() => {
            this.switches = viewSettings.all();
            this.writeNextFrame();
        });
        this.stopFollowing = [stopView, stopSwitches];

        return restored;
    }

    stop() {
        for (const stopOne of this.stopFollowing) {
            stopOne();
        }
        this.stopFollowing = [];
    }

    // Writes a change waiting for its frame at once.
    flush() {
        if (this.cancelWrite === undefined) return;

        this.writeNow();
    }

    private writeNextFrame() {
        if (this.cancelWrite !== undefined) return;

        this.cancelWrite = this.frames.nextFrame(() => {
            this.cancelWrite = undefined;
            this.writeNow();
        });
    }

    private writeNow() {
        if (this.cancelWrite !== undefined) {
            this.cancelWrite();
            this.cancelWrite = undefined;
        }

        const settings: Record<string, unknown> = {
            ...this.others,
            viewSwitches: this.switches,
            foldedCards: this.foldedCards,
            persistAsked: this.asked,
            sessionOpen: this.open,
        };
        if (this.view !== undefined) {
            settings.view = this.view;
        }

        const text = JSON.stringify(settings);
        this.store.write(text);
    }
}

function restoreView(view: ViewState, saved: SavedView) {
    view.zoomAboutMiddle(saved.zoom);
    view.centreOn({ x: saved.x, y: saved.y });
}

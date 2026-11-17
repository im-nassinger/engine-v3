import { VersionCounter } from '../../../core/events/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { EntityId } from '../../../core/fields/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelData } from '../../../core/level-data/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { TickInputs, TickReport } from '../../../core/simulation/index.ts';
import type { EditorSession } from '../../session/index.ts';
import { StatusText } from '../../status/index.ts';
import type { Cancel, Clock, FrameScheduler, Timer } from '../../time/index.ts';

import { HeldKeys } from '../inputs/HeldKeys.ts';
import type { PageChange, PageLifecycle } from '../inputs/PageLifecycle.ts';
import { PlayMirror } from '../mirror/PlayMirror.ts';
import { TickPacer } from '../pacing/TickPacer.ts';
import type { GameRunner, StartOutcome, TicksOutcome } from '../runner/GameRunner.ts';
import { Watchdog } from '../watchdog/Watchdog.ts';

// idle: the editor. starting: Play was pressed and the game is loading the level. playing and paused: a run
// is going. ended: the run is over with a message, and its last frame stays until Stop.
export type PlayState = 'idle' | 'starting' | 'playing' | 'paused' | 'ended';

export const NOT_RESPONDING_TEXT = "The game isn't responding";
export const STOP_TO_EDIT_TEXT = 'Stop to edit';
export const HUNG_TEXT = 'The game stopped responding, so the run ended';
export const CRASHED_TEXT = 'The game crashed, so the run ended';
export const FAILED_TEXT = "The level couldn't be started, so the run ended";

export type PlaySessionOptions = {
    readonly session: EditorSession;
    readonly runner: GameRunner;
    readonly clock: Clock;
    readonly timer: Timer;
    readonly frames: FrameScheduler;
    // Commits a field being typed in, so the run starts from what is on screen.
    commitTyping(): void;
    // Saves the level now. Play doesn't wait for it.
    saveNow(): Promise<void>;
    isDialogOpen(): boolean;
    // The keys held now, shared with the keyboard adapter. Nothing held when left out.
    readonly heldKeys?: HeldKeys;
    readonly writer?: LevelWriter;
};

// Test play: the Play, Stop, Pause and Step rules, the run's state and what the Play bar shows. It never
// changes the editor's level, history, selection, view, tool or current group, so Stop gives the editor
// back exactly as it was by dropping the run and nothing else.
export class PlaySession {
    // Raised on every change the Play bar shows: the state, the notice, the ended message.
    readonly version = new VersionCounter();
    // Raised each frame the mirror is drawn at a new place, for the level view.
    readonly drawn = new VersionCounter();
    // The Play bar's short texts, cleared after 4 seconds: "Stop to edit" and the hard limit's warning.
    readonly hint: StatusText;
    private readonly options: PlaySessionOptions;
    private readonly writer: LevelWriter;
    private readonly pacer: TickPacer;
    private readonly watchdog: Watchdog;
    private readonly heldKeys: HeldKeys;
    // The tab was hidden while the game was loading, so the run starts paused.
    private pauseWhenStarted = false;
    private currentState: PlayState = 'idle';
    private currentMirror: PlayMirror | undefined;
    private currentNotice: string | undefined;
    private currentEndedMessage: string | undefined;
    private currentEndedDetail: string | undefined;
    // Raised by every Play and Stop, so an answer to an earlier run is dropped.
    private run = 0;
    private batchInFlight = false;
    private cancelFrame: Cancel | undefined;

    constructor(options: PlaySessionOptions) {
        this.options = options;
        this.writer = options.writer ?? new LevelWriter();
        this.pacer = new TickPacer(options.clock);
        this.watchdog = new Watchdog(options.clock);
        this.hint = new StatusText(options.timer);
        this.heldKeys = options.heldKeys ?? new HeldKeys();
    }

    // A hidden tab pauses the run and releases every key; a lost window focus only releases them.
    connectPage(page: PageLifecycle): Unsubscribe {
        return page.subscribe((change) => this.pageChanged(change));
    }

    get state() {
        return this.currentState;
    }

    // From Play until Stop, also while starting and once ended.
    get isRunGoing() {
        return this.currentState !== 'idle';
    }

    // The running level to draw instead of the editor's, while playing, paused or ended.
    get mirror() {
        return this.currentMirror;
    }

    // "The game isn't responding" while it stands.
    get notice() {
        return this.currentNotice;
    }

    // Why the run ended, until Stop.
    get endedMessage() {
        return this.currentEndedMessage;
    }

    // The crash's own words, for developers and tests, never shown as they are.
    get endedDetail() {
        return this.currentEndedDetail;
    }

    get canStep() {
        return this.currentState === 'paused';
    }

    // Ignored during a run, in the middle of a drag or while a dialog is open.
    play() {
        if (this.isRunGoing) return;
        if (this.options.session.openLevel.liveEdit.isActive) return;
        if (this.options.isDialogOpen()) return;

        this.options.commitTyping();
        void this.options.saveNow();

        const levelData = this.writer.write(this.options.session.openLevel.level);
        this.run += 1;
        const run = this.run;
        this.setState('starting');

        const starting = this.options.runner.start(levelData, { clockTimeMs: this.options.clock.nowMs() });
        void starting.then((outcome) => this.started(run, levelData, outcome));
    }

    // Instant from any state: the run is dropped, and the editor, never touched, shows again.
    stop() {
        if (!this.isRunGoing) return;

        const runWasEnded = this.currentState === 'ended';
        this.dropRun();
        if (!runWasEnded) {
            this.options.runner.stop();
        }

        this.setState('idle');
    }

    // Play or Stop, for Ctrl+Enter and the one button.
    playOrStop() {
        if (this.isRunGoing) {
            this.stop();
            return;
        }

        this.play();
    }

    pause() {
        if (this.currentState !== 'playing') return;

        this.pacer.pause();
        this.setState('paused');
    }

    resume() {
        if (this.currentState !== 'paused') return;

        this.pacer.resume();
        this.setState('playing');
    }

    // Pause or Resume, for F8 and the one button.
    pauseOrResume() {
        if (this.currentState === 'paused') {
            this.resume();
            return;
        }

        this.pause();
    }

    // One tick, with the keys held now, while paused. Off once the run has ended.
    step() {
        if (!this.canStep) return;

        this.pacer.stepOnce();
    }

    // The game lost the keyboard, as when the Play bar is clicked: the run goes on with nothing held.
    releaseKeys() {
        this.heldKeys.releaseAll();
    }

    // An edit tried during play: nothing changes, and the Play bar says why.
    refuseEdit() {
        this.hint.show(STOP_TO_EDIT_TEXT);
    }

    private started(run: number, levelData: LevelData, outcome: StartOutcome) {
        if (run !== this.run) return;

        if (outcome.kind === 'failed') {
            this.end(FAILED_TEXT, outcome.reason.reason);
            return;
        }
        if (outcome.kind === 'crashed') {
            this.end(CRASHED_TEXT, outcome.detail);
            return;
        }

        const mirrored = PlayMirror.start(levelData);
        if (!mirrored.ok) {
            this.options.runner.stop();
            this.end(FAILED_TEXT, mirrored.refusal.reason);
            return;
        }

        this.currentMirror = mirrored.value;
        this.pacer.start();
        this.watchdog.reset();
        if (this.pauseWhenStarted) {
            this.pauseWhenStarted = false;
            this.pacer.pause();
            this.setState('paused');
        } else {
            this.setState('playing');
        }
        this.askForFrame();
    }

    private askForFrame() {
        this.cancelFrame = this.options.frames.nextFrame(() => this.frame());
    }

    private frame() {
        this.cancelFrame = undefined;
        const mirror = this.currentMirror;
        if (mirror === undefined) return;

        const verdict = this.watchdog.check();
        if (verdict === 'hung') {
            this.options.runner.terminate();
            this.end(HUNG_TEXT, undefined);
            return;
        }
        this.showNotice(verdict === 'notResponding');

        this.sendTicksDue();

        mirror.drawAt(this.pacer.interpolation);
        this.drawn.increment();
        this.askForFrame();
    }

    private sendTicksDue() {
        if (this.batchInFlight) return;

        const count = this.pacer.ticksDue();
        if (count === 0) return;

        const heldKeys = this.heldKeys.codes();
        const inputs: TickInputs = { heldKeys };
        const inputsPerTick = Array.from({ length: count }, () => inputs);
        const run = this.run;

        this.batchInFlight = true;
        this.pacer.batchSent(count);
        this.watchdog.requestSent();

        const ticking = this.options.runner.runTicks(inputsPerTick);
        void ticking.then((outcome) => this.ticked(run, outcome));
    }

    private ticked(run: number, outcome: TicksOutcome) {
        if (run !== this.run) return;

        this.batchInFlight = false;
        this.pacer.reportReceived();
        this.watchdog.answerReceived();
        this.showNotice(false);

        if (outcome.kind === 'crashed') {
            this.end(CRASHED_TEXT, outcome.detail);
            return;
        }

        this.applyReport(outcome.report);
    }

    private applyReport(report: TickReport) {
        const mirror = this.currentMirror;
        if (mirror === undefined) return;

        const warning = hardLimitWarning(mirror, report.removedPastHardLimit);
        mirror.apply(report);

        if (warning !== undefined) {
            this.hint.show(warning);
        }
    }

    // The last frame stays, nothing more is asked of the game, and the message stays until Stop.
    private end(message: string, detail: string | undefined) {
        this.cancelFrame?.();
        this.cancelFrame = undefined;
        this.watchdog.reset();
        this.batchInFlight = false;
        this.currentNotice = undefined;
        this.currentEndedMessage = message;
        this.currentEndedDetail = detail;
        this.setState('ended');
    }

    private pageChanged(change: PageChange) {
        this.releaseKeys();
        if (change !== 'hidden') return;

        if (this.currentState === 'starting') {
            this.pauseWhenStarted = true;
            return;
        }
        this.pause();
    }

    private dropRun() {
        this.run += 1;
        this.pauseWhenStarted = false;
        this.cancelFrame?.();
        this.cancelFrame = undefined;
        this.watchdog.reset();
        this.batchInFlight = false;
        this.currentMirror = undefined;
        this.currentNotice = undefined;
        this.currentEndedMessage = undefined;
        this.currentEndedDetail = undefined;
    }

    private showNotice(shown: boolean) {
        const notice = shown ? NOT_RESPONDING_TEXT : undefined;
        if (notice === this.currentNotice) return;

        this.currentNotice = notice;
        this.version.increment();
    }

    private setState(state: PlayState) {
        this.currentState = state;
        this.version.increment();
    }
}

// Names the bodies before the mirror removes them.
function hardLimitWarning(mirror: PlayMirror, removed: readonly EntityId[]) {
    const firstId = removed[0];
    if (firstId === undefined) return undefined;

    const first = mirror.level.findEntity(firstId);
    let firstName = 'An entity';
    if (first !== undefined) {
        firstName = labelName(first);
    }

    if (removed.length === 1) return `${firstName} went past the hard limit and was removed`;

    const othersCount = removed.length - 1;

    return `${firstName} and ${othersCount} more went past the hard limit and were removed`;
}

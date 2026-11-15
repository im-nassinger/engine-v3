import type { Level } from '../../core/entities/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import type { Clock } from '../time/index.ts';

import { SetValueChange } from './changes/index.ts';
import type { LevelChange } from './changes/index.ts';
import type { HistoryStep, NewHistoryStep } from './HistoryStep.ts';

// The undo and redo lists. Lost on reload. Selection and current group are put back by LevelEditor.
export class History {
    static readonly stepLimit = 512;
    static readonly joinWithinMs = 1_000;

    readonly version = new VersionCounter();
    private readonly clock: Clock;
    private undoSteps: HistoryStep[] = [];
    private redoSteps: HistoryStep[] = [];
    // Only the step recorded last may be joined: after an undo or redo the top step is an older one.
    private lastStepCanJoin = false;

    constructor(clock: Clock) {
        this.clock = clock;
    }

    record(newStep: NewHistoryStep) {
        const recordedAtMs = this.clock.nowMs();
        const step: HistoryStep = { ...newStep, recordedAtMs };
        const lastStep = this.undoSteps.at(-1);

        if (lastStep !== undefined && this.joins(lastStep, step)) {
            this.undoSteps[this.undoSteps.length - 1] = joinSteps(lastStep, step);
        } else {
            this.undoSteps.push(step);
        }

        if (this.undoSteps.length > History.stepLimit) {
            this.undoSteps.shift();
        }

        this.redoSteps = [];
        this.lastStepCanJoin = true;
        this.version.increment();
    }

    undo(level: Level) {
        const step = this.undoSteps.pop();
        if (step === undefined) return undefined;

        const newestFirst = [...step.changes].reverse();
        for (const change of newestFirst) {
            change.revert(level);
        }

        this.redoSteps.push(step);
        this.lastStepCanJoin = false;
        this.version.increment();

        return step;
    }

    redo(level: Level) {
        const step = this.redoSteps.pop();
        if (step === undefined) return undefined;

        for (const change of step.changes) {
            change.apply(level);
        }

        this.undoSteps.push(step);
        this.lastStepCanJoin = false;
        this.version.increment();

        return step;
    }

    get undoLabel() {
        return this.undoSteps.at(-1)?.label;
    }

    get redoLabel() {
        return this.redoSteps.at(-1)?.label;
    }

    get undoCount() {
        return this.undoSteps.length;
    }

    get redoCount() {
        return this.redoSteps.length;
    }

    clear() {
        this.undoSteps = [];
        this.redoSteps = [];
        this.lastStepCanJoin = false;
        this.version.increment();
    }

    private joins(lastStep: HistoryStep, step: HistoryStep) {
        if (!this.lastStepCanJoin) return false;
        if (step.joinKey === undefined) return false;
        if (step.joinKey !== lastStep.joinKey) return false;

        const sinceLastMs = step.recordedAtMs - lastStep.recordedAtMs;

        return sinceLastMs <= History.joinWithinMs;
    }
}

// The joined step keeps where the run started and takes everything else from the newest step, its time
// included, so a run keeps joining as long as each step comes within a second of the one before.
function joinSteps(earlier: HistoryStep, later: HistoryStep): HistoryStep {
    const changes = joinChanges(earlier.changes, later.changes);

    return {
        ...later,
        changes,
        selectionBefore: earlier.selectionBefore,
        groupPathBefore: earlier.groupPathBefore,
    };
}

// Edits to one value keep the first old value and the last new one. Only when both steps hold nothing
// but value edits: another change between two edits of a value (a move writes the TransformComponent)
// would be applied in the wrong order.
function joinChanges(earlier: readonly LevelChange[], later: readonly LevelChange[]) {
    const earlierValueChanges = onlyValueChanges(earlier);
    const laterValueChanges = onlyValueChanges(later);

    if (earlierValueChanges === undefined || laterValueChanges === undefined) {
        return [...earlier, ...later];
    }

    const joined = [...earlierValueChanges];
    for (const laterChange of laterValueChanges) {
        const sameValueIndex = joined.findIndex((change) => change.writesSameValueAs(laterChange));

        if (sameValueIndex === -1) {
            joined.push(laterChange);
            continue;
        }

        const earlierChange = joined[sameValueIndex];
        if (earlierChange === undefined) continue;

        joined[sameValueIndex] = earlierChange.joinedWith(laterChange);
    }

    return joined;
}

function onlyValueChanges(changes: readonly LevelChange[]) {
    const valueChanges: SetValueChange[] = [];

    for (const change of changes) {
        if (!(change instanceof SetValueChange)) return undefined;
        valueChanges.push(change);
    }

    return valueChanges;
}

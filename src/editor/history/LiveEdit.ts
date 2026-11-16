import type { AnyComponentSchema, AnyValueEntry } from '../../core/components/index.ts';
import { VersionCounter } from '../../core/events/index.ts';
import type { ParseOutcome } from '../../core/fields/index.ts';
import type { EntityId, Level } from '../../core/level/index.ts';

import { SetValueChange } from './changes/index.ts';
import { requireComponentByType } from './changes/requireComponentByType.ts';
import { writeKnownValue } from './changes/writeKnownValue.ts';
import type { LevelEditor } from './LevelEditor.ts';

// One value a drag changes: a field or stored value of one entity's component.
export type ValueTarget = {
    readonly entityId: EntityId;
    readonly schema: AnyComponentSchema;
    readonly key: string;
};

type StartedValue = {
    readonly target: ValueTarget;
    readonly entry: AnyValueEntry;
    readonly startValue: unknown;
};

// A drag: values change in the level every frame with no history, and the release makes one step from
// the start values to the current ones. Esc puts the start values back and makes no step.
export class LiveEdit {
    // Moves when a drag begins and when it ends, so saving can wait for the drag's end.
    readonly activeChanged = new VersionCounter();
    private readonly level: Level;
    private readonly editor: LevelEditor;
    private started = new Map<string, StartedValue>();
    private active = false;

    constructor(level: Level, editor: LevelEditor) {
        this.level = level;
        this.editor = editor;
    }

    // While true, Undo and Redo are off: Ctrl+Z is ignored while a drag holds the mouse.
    get isActive() {
        return this.active;
    }

    // False, with nothing begun, when the level is read-only: the caller starts no drag.
    begin(targets: readonly ValueTarget[]) {
        if (this.active) throw new Error('A live edit is already running.');
        if (this.editor.isReadOnly) return false;

        const started = new Map<string, StartedValue>();
        for (const target of targets) {
            const entry = requireEntry(target);
            const component = this.componentOf(target);
            const startValue = entry.type.clone(component.readValue(target.key));

            started.set(targetKey(target), { target, entry, startValue });
        }

        this.started = started;
        this.active = true;
        this.activeChanged.increment();

        return true;
    }

    // Writes the value now, without history. A value the field refuses is left out and the old one kept,
    // so a tool can go on dragging past it.
    update(target: ValueTarget, value: unknown): ParseOutcome<unknown> {
        const { entry } = this.requireStarted(target);
        const component = this.componentOf(target);

        return component.writeValue(target.key, entry.type.serialize(value));
    }

    // One step from the start values to the current ones; values back where they started make none.
    // A joinKey joins it to the last step with the same key, as a run of nudges is.
    commit(label: string, joinKey?: string) {
        const changes = this.takeChanges();

        this.editor.recordApplied(label, changes, joinKey);
    }

    // Esc. Says whether there was a drag to cancel, for the Esc chain.
    cancel() {
        if (!this.active) return false;

        for (const { target, entry, startValue } of this.started.values()) {
            writeKnownValue(this.componentOf(target), entry, startValue);
        }

        this.end();

        return true;
    }

    private takeChanges() {
        if (!this.active) throw new Error('No live edit to commit.');

        const changes: SetValueChange[] = [];
        for (const { target, entry, startValue } of this.started.values()) {
            const currentValue = this.componentOf(target).readValue(target.key);
            if (entry.type.equals(startValue, currentValue)) continue;

            const change = new SetValueChange({
                entityId: target.entityId,
                schema: target.schema,
                key: target.key,
                oldValue: startValue,
                newValue: currentValue,
            });
            changes.push(change);
        }

        this.end();

        return changes;
    }

    private end() {
        this.started = new Map();
        this.active = false;
        this.activeChanged.increment();
    }

    private requireStarted(target: ValueTarget) {
        if (!this.active) throw new Error('No live edit to update.');

        const started = this.started.get(targetKey(target));
        if (started === undefined) {
            throw new Error(`${target.schema.typeName}'s ${target.key} on entity ${target.entityId} wasn't begun.`);
        }

        return started;
    }

    private componentOf(target: ValueTarget) {
        const entity = this.level.requireEntity(target.entityId);

        return requireComponentByType(entity, target.schema.typeName);
    }
}

function requireEntry(target: ValueTarget) {
    const entry = target.schema.findEntry(target.key);
    if (entry === undefined) throw new Error(`${target.schema.typeName} has no value ${target.key}.`);

    return entry;
}

function targetKey(target: ValueTarget) {
    return `${target.entityId}:${target.schema.typeName}:${target.key}`;
}

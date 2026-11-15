import { Signal, VersionCounter } from '../../../core/events/index.ts';
import type { Unsubscribe } from '../../../core/events/index.ts';
import type { Entity, EntityId, Level, LevelUpdate } from '../../../core/level/index.ts';
import type { Cancel, FrameScheduler } from '../../time/index.ts';

import { sameMessages } from '../model/EditorMessage.ts';
import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

const NONE: readonly EditorMessage[] = [];
const NONE_READ: readonly EntityId[] = [];

// Every editor message of one level. The whole level is checked when it opens; after that, only the
// entities a LevelUpdate names, once per frame, so one edit among 10,000 entities checks one entity.
export class EditorMessages {
    // Moves whenever any message comes or goes: the status bar's count.
    readonly version = new VersionCounter();
    // The entities whose messages changed in one check, for an Inspector showing some of them.
    readonly changed = new Signal<ReadonlySet<EntityId>>();
    private readonly level: Level;
    private readonly rules: readonly EditorMessageRule[];
    private readonly frames: FrameScheduler;
    private readonly unsubscribe: Unsubscribe;
    private readonly byEntity = new Map<EntityId, readonly EditorMessage[]>();
    private readonly levelWide = new Map<string, readonly EditorMessage[]>();
    // For each entity id, the entities whose check reads it, and the other way round.
    private readonly readers = new Map<EntityId, Set<EntityId>>();
    private readonly readsOf = new Map<EntityId, readonly EntityId[]>();
    private toCheck = new Set<EntityId>();
    private cancelFrame: Cancel | undefined;
    private allAtVersion: { readonly version: number; readonly messages: readonly EditorMessage[] } | undefined;

    constructor(level: Level, rules: readonly EditorMessageRule[], frames: FrameScheduler) {
        this.level = level;
        this.rules = rules;
        this.frames = frames;

        for (const entity of level.entitiesInPanelOrder()) {
            this.recheck(entity.id);
        }

        this.unsubscribe = level.signals.updated.subscribe((update) => this.follow(update));
    }

    forEntity(id: EntityId) {
        return this.byEntity.get(id) ?? NONE;
    }

    // The status bar's count and list: the level-wide messages first, then each entity's.
    all() {
        const version = this.version.version;
        if (this.allAtVersion?.version === version) return this.allAtVersion.messages;

        const messages = [...this.levelWide.values(), ...this.byEntity.values()].flat();
        this.allAtVersion = { version, messages };

        return messages;
    }

    // A message about the whole level, such as a failed save, kept under its source until it sets none.
    setLevelWide(source: string, messages: readonly EditorMessage[]) {
        const current = this.levelWide.get(source) ?? NONE;
        if (sameMessages(current, messages)) return;

        if (messages.length === 0) {
            this.levelWide.delete(source);
        } else {
            this.levelWide.set(source, messages);
        }
        this.version.increment();
    }

    dispose() {
        this.unsubscribe();
        this.cancelFrame?.();
        this.cancelFrame = undefined;
    }

    private follow(update: LevelUpdate) {
        switch (update.kind) {
            case 'entityAdded':
            case 'entityRemoved':
                this.markToCheck(update.entity.id);
                this.markReadersToCheck(update.entity.id);
                return;
            case 'entityMoved':
            case 'componentAdded':
            case 'componentRemoved':
            case 'valueChanged':
                this.markToCheck(update.entity.id);
                return;
            case 'switchChanged':
            case 'levelRenamed':
                return;
        }
    }

    private markReadersToCheck(id: EntityId) {
        for (const reader of this.readers.get(id) ?? []) {
            this.markToCheck(reader);
        }
    }

    private markToCheck(id: EntityId) {
        this.toCheck.add(id);
        this.cancelFrame ??= this.frames.nextFrame(() => this.checkMarked());
    }

    private checkMarked() {
        this.cancelFrame = undefined;
        const ids = this.toCheck;
        this.toCheck = new Set();

        const changedIds = new Set<EntityId>();
        for (const id of ids) {
            const didChange = this.recheck(id);
            if (didChange) {
                changedIds.add(id);
            }
        }
        if (changedIds.size === 0) return;

        this.version.increment();
        this.changed.emit(changedIds);
    }

    // True when the entity's messages are no longer what they were.
    private recheck(id: EntityId) {
        const entity = this.level.findEntity(id);
        const messages = entity === undefined ? NONE : this.check(entity);
        const reads = entity === undefined ? NONE_READ : this.readsOfEntity(entity);
        this.recordReads(id, reads);

        const before = this.byEntity.get(id) ?? NONE;
        if (sameMessages(before, messages)) return false;

        if (messages.length === 0) {
            this.byEntity.delete(id);
        } else {
            this.byEntity.set(id, messages);
        }

        return true;
    }

    private check(entity: Entity) {
        return this.rules.flatMap((rule) => rule.check(entity, this.level));
    }

    private readsOfEntity(entity: Entity) {
        return this.rules.flatMap((rule) => rule.readsEntities?.(entity) ?? NONE_READ);
    }

    private recordReads(id: EntityId, reads: readonly EntityId[]) {
        for (const read of this.readsOf.get(id) ?? NONE_READ) {
            const readersOfIt = this.readers.get(read);
            readersOfIt?.delete(id);
            if (readersOfIt?.size === 0) {
                this.readers.delete(read);
            }
        }

        if (reads.length === 0) {
            this.readsOf.delete(id);
            return;
        }

        this.readsOf.set(id, reads);
        for (const read of reads) {
            const readersOfIt = this.readers.get(read) ?? new Set<EntityId>();
            readersOfIt.add(id);
            this.readers.set(read, readersOfIt);
        }
    }
}

import type { Unsubscribe } from '../../events/index.ts';
import type { Entity, Level, LevelUpdate } from '../../level/index.ts';

import type { LevelWriter } from './LevelWriter.ts';

// level.json's text for one level, the same as JSON.stringify(writer.write(level)), with each entity's
// written subtree kept until it or something inside it changes. A save then writes again only the changed
// entities and their parents, and puts the rest together from the kept text (performance.md: saving only
// what changed). It follows the level's updates, so dispose it with the level.
export class LevelText {
    private readonly level: Level;
    private readonly writer: LevelWriter;
    private readonly keptByEntity = new WeakMap<Entity, string>();
    private readonly stopFollowing: Unsubscribe;

    constructor(level: Level, writer: LevelWriter) {
        this.level = level;
        this.writer = writer;
        this.stopFollowing = level.signals.updated.subscribe((update) => this.forget(update));
    }

    text(): string {
        const header = JSON.stringify(this.writer.writeHeader(this.level));

        return `${withoutLastBrace(header)},"world":${this.entityText(this.level.world)}}`;
    }

    dispose() {
        this.stopFollowing();
    }

    // Recursion is safe: the level is never deeper than the depth limit.
    private entityText(entity: Entity): string {
        const kept = this.keptByEntity.get(entity);
        if (kept !== undefined) return kept;

        const own = JSON.stringify(this.writer.writeOwnEntity(entity));
        const children = entity.children.map((child) => this.entityText(child)).join(',');
        const text = `${withoutLastBrace(own)},"children":[${children}]}`;
        this.keptByEntity.set(entity, text);

        return text;
    }

    // An entity's text holds its subtree's, so a change forgets it and every parent above it. An added entity
    // forgets its whole subtree too: text kept from before it was removed may be stale.
    private forget(update: LevelUpdate) {
        switch (update.kind) {
            case 'levelRenamed':
                return;
            case 'entityAdded':
                this.forgetSubtree(update.entity);
                this.forgetWithParents(update.entity);
                return;
            case 'entityRemoved':
            case 'entityMoved':
                this.forgetWithParents(update.entity);
                this.forgetWithParents(update.formerParent);
                return;
            default:
                this.forgetWithParents(update.entity);
        }
    }

    private forgetWithParents(entity: Entity) {
        for (let current: Entity | undefined = entity; current !== undefined; current = current.parent) {
            this.keptByEntity.delete(current);
        }
    }

    private forgetSubtree(entity: Entity) {
        this.keptByEntity.delete(entity);
        for (const child of entity.children) {
            this.forgetSubtree(child);
        }
    }
}

// JSON.stringify of an object always ends with its closing brace.
function withoutLastBrace(json: string) {
    return json.slice(0, -1);
}

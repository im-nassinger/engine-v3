import type { AnyComponent } from '../../../core/components/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { LevelWriter } from '../../../core/level-data/index.ts';
import type { LevelReader } from '../../../core/level-data/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';

const LOCKED = 'This group is locked';
const TOO_DEEP = `Groups can be at most ${Level.maxDepth} deep`;

export type DrawnEntityOutcome =
    { readonly kind: 'created'; readonly id: EntityId } | { readonly kind: 'refused'; readonly reason: string };

// What a drawing tool made: the word its name starts with, such as "Rectangle", and its components, given
// the name the entity gets.
export type DrawnEntity = {
    readonly word: string;
    components(name: string): readonly AnyComponent[];
};

// Adds what a drawing tool made to the current group, on top, named "<word> 1" one more than the highest
// number used, and selected, in one step "Draw <name>". Refused inside a locked group, or when the group is as
// deep as a level goes.
export function addDrawnEntity(openLevel: OpenLevel, reader: LevelReader, drawn: DrawnEntity): DrawnEntityOutcome {
    const { level, editor, currentGroup, caches } = openLevel;
    const group = currentGroup.group;
    if (caches.hidden.isLocked(group)) return { kind: 'refused', reason: LOCKED };
    if (group.depth + 1 > Level.maxDepth) return { kind: 'refused', reason: TOO_DEEP };

    const name = new EntityNamer(level).nextName(drawn.word);
    const id = level.allocateId();
    const data = new LevelWriter().writeNewEntity(id, drawn.components(name));
    const place = { parentId: group.id, index: 0 };

    const outcome = editor.edit(`Draw ${name}`, (transaction) => {
        transaction.apply(new AddEntitiesChange({ reader, entities: [data], place }));

        return { kind: 'done', selectAfter: [id] };
    });
    if (outcome.kind === 'refused') return outcome;

    return { kind: 'created', id };
}

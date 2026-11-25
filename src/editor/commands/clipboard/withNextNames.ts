import { NameComponent } from '../../../core/components/index.ts';
import { isPlainObject } from '../../../core/fields/index.ts';
import type { Level } from '../../../core/level/index.ts';
import { EntityNamer } from '../shared/EntityNamer.ts';

const NAME_TYPE_NAME = NameComponent.schema.typeName;
const WORD_AND_NUMBER = /^(.+) ([0-9]+)$/;

// The copied entities, nested ones included, with each name that is a word and a number, such as "Box 1",
// given the next number for that word in the level: a copy of "Box 1" is "Box 2", not a second "Box 1". Other
// names stay. Paste and Duplicate use it before LevelReader checks the entities, so the data is still
// untrusted: anything not shaped as an entity is left as it is, for the reader to refuse.
export function withNextNames(entities: readonly unknown[], level: Level): readonly unknown[] {
    const namer = new EntityNamer(level);

    return entities.map((raw) => renamed(raw, namer));
}

// Parents first, so the numbers count up in panel order.
function renamed(raw: unknown, namer: EntityNamer): unknown {
    if (!isPlainObject(raw)) return raw;

    const copy: Record<string, unknown> = { ...raw };
    copy['components'] = renamedComponents(raw['components'], namer);

    const children = raw['children'];
    if (Array.isArray(children)) {
        copy['children'] = children.map((child: unknown) => renamed(child, namer));
    }

    return copy;
}

function renamedComponents(components: unknown, namer: EntityNamer) {
    if (!isPlainObject(components)) return components;

    const nameValues = components[NAME_TYPE_NAME];
    if (!isPlainObject(nameValues)) return components;

    const name = nameValues['name'];
    if (typeof name !== 'string') return components;

    const match = WORD_AND_NUMBER.exec(name);
    const word = match?.[1];
    if (word === undefined) return components;

    const nextName = namer.nextName(word);
    const renamedValues = { ...nameValues, name: nextName };

    return { ...components, [NAME_TYPE_NAME]: renamedValues };
}

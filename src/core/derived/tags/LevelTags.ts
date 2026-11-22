import { TagsComponent } from '../../components/index.ts';
import { wordName } from '../../fields/index.ts';
import type { Level } from '../../level/index.ts';

// Every tag in the level, each once, in A to Z order: what the tags field offers and the trigger card's
// pickers list.
export class LevelTags {
    static of(level: Level) {
        const tags = new Set<string>();

        for (const entity of level.entitiesInPanelOrder()) {
            const component = entity.getComponent(TagsComponent);
            if (component === undefined) continue;

            for (const tag of component.get('tags')) {
                tags.add(tag);
            }
        }

        return [...tags].sort();
    }

    // The level's tags that start with what is typed, made a tag first, but the ones already held. Nothing
    // while nothing is typed.
    static matching(levelTags: readonly string[], typed: string, heldTags: readonly string[]) {
        const typedWord = wordName(typed);
        if (typedWord === '') return [];

        return levelTags.filter((tag) => tag.startsWith(typedWord) && !heldTags.includes(tag));
    }
}

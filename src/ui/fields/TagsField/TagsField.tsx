import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { LevelTags } from '../../../core/derived/index.ts';
import { MIXED, TagEdits } from '../../../editor/entity-inspector/index.ts';
import { useCommands } from '../../commands/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { levelHistoryCommand } from '../typing/levelHistoryCommand.ts';
import { returnKeyboardToLevelView } from '../typing/returnKeyboardToLevelView.ts';
import { TagPill } from './TagPill/index.ts';
import { TagSuggestions } from './TagSuggestions/index.ts';
import './TagsField.css';

// One pill holding each tag with its ×, then a box: Enter adds what is typed and keeps the box focused for
// the next one, Esc empties it and gives the keyboard back to the level view. While typing, the level's
// tags that start with the text are offered under the field. Each add or remove is one step on every shown
// entity, each keeping its own other tags. Mixed tags show no pills: a tag typed is still added to all.
export function TagsField({ field, subject, onCommitEach }: FieldProps) {
    const { registry, runner, platform } = useCommands();
    const [typed, setTyped] = useState('');

    const value = field.value;
    const isMixed = value === MIXED;
    let tags: readonly string[] = [];
    if (Array.isArray(value)) {
        tags = value as readonly string[];
    }

    const add = (tag: string) => {
        onCommitEach((held) => TagEdits.withTag(held, tag));
        setTyped('');
    };

    const remove = (tag: string) => onCommitEach((held) => TagEdits.withoutTag(held, tag));

    const addTyped = () => {
        const tag = TagEdits.typedTag(typed);
        if (tag === undefined) return;

        add(tag);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.defaultPrevented) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            addTyped();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setTyped('');
            returnKeyboardToLevelView(event.currentTarget);
            return;
        }

        if (typed !== '') return;

        const historyCommand = levelHistoryCommand(event, registry, platform);
        if (historyCommand === undefined) return;

        event.preventDefault();
        runner.run(historyCommand);
    };

    let suggestions: readonly string[] = [];
    if (typed !== '') {
        const levelTags = LevelTags.of(subject.openLevel.level);
        suggestions = LevelTags.matching(levelTags, typed, tags);
    }

    const placeholder = isMixed ? 'Mixed' : 'Add a tag';

    return (
        <div className="tags-field">
            <div className="pill" data-enabled={field.isEnabled}>
                {tags.map((tag) => (
                    <TagPill key={tag} tag={tag} isEnabled={field.isEnabled} onRemove={remove} />
                ))}
                <input
                    value={typed}
                    aria-label={field.definition.label}
                    placeholder={placeholder}
                    spellCheck={false}
                    disabled={!field.isEnabled}
                    onChange={(event) => setTyped(event.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
            {suggestions.length > 0 && <TagSuggestions tags={suggestions} onPick={add} />}
        </div>
    );
}

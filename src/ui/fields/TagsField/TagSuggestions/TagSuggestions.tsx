import type { MouseEvent } from 'react';
import './TagSuggestions.css';

export type TagSuggestionsProps = {
    tags: readonly string[];
    onPick: (tag: string) => void;
};

// The level's tags matching what is typed, in a small menu under the tags field. A press keeps the
// keyboard in the box, so the next tag can be typed at once.
export function TagSuggestions({ tags, onPick }: TagSuggestionsProps) {
    const keepFocus = (event: MouseEvent) => event.preventDefault();

    return (
        <div className="tag-suggestions" role="listbox" aria-label="Tags in the level">
            {tags.map((tag) => (
                <div
                    key={tag}
                    className="choice"
                    role="option"
                    aria-selected={false}
                    onMouseDown={keepFocus}
                    onClick={() => onPick(tag)}
                >
                    {tag}
                </div>
            ))}
        </div>
    );
}

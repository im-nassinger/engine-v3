import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import { returnKeyboardToLevelView } from '../../../fields/index.ts';
import './TypedDebugEntry.css';

export type TypedDebugEntryProps = {
    label: string;
    value: string;
    // What was typed, once Enter is pressed or the box loses focus.
    onTyped: (text: string) => void;
};

// A debug box entry whose value can be clicked and typed over. Enter or leaving the box sets it, Esc keeps
// the old value, and both give the keyboard back to the level view.
export function TypedDebugEntry({ label, value, onTyped }: TypedDebugEntryProps) {
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const isCancelled = useRef(false);
    const shownText = draft ?? value;
    const boxStyle = { '--chars': Math.max(shownText.length, 2) } as Record<string, number>;

    const startTyping = (event: FocusEvent<HTMLInputElement>) => {
        isCancelled.current = false;
        setDraft(value);
        event.currentTarget.select();
    };

    const type = (event: ChangeEvent<HTMLInputElement>) => {
        setDraft(event.currentTarget.value);
    };

    const finishTyping = () => {
        const typed = draft;
        setDraft(undefined);
        if (isCancelled.current || typed === undefined || typed === value) return;

        onTyped(typed);
    };

    const pressKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' && event.key !== 'Escape') return;

        event.preventDefault();
        isCancelled.current = event.key === 'Escape';
        returnKeyboardToLevelView(event.currentTarget);
    };

    return (
        <label className="typed-debug-entry" data-entry={label}>
            <span className="label">{label}:</span>
            <input
                className="value"
                aria-label={label}
                value={shownText}
                style={boxStyle}
                spellCheck={false}
                onFocus={startTyping}
                onChange={type}
                onBlur={finishTyping}
                onKeyDown={pressKey}
            />
        </label>
    );
}

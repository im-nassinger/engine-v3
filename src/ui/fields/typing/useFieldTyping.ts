import { useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCommands } from '../../commands/index.ts';
import { levelHistoryCommand } from './levelHistoryCommand.ts';
import { returnKeyboardToLevelView } from './returnKeyboardToLevelView.ts';

export type FieldTexts = {
    // What the field shows while it isn't focused: the value rounded, or '' when Mixed.
    readonly shownText: string;
    // What it shows once focused: the value in full.
    readonly fullText: string;
};

export type FieldTypingOptions = FieldTexts & {
    // Tries the typed text: true when it was committed or restored, false when it was refused, which
    // keeps the text so the field can show why.
    commit: (text: string) => boolean;
    // The typed text was dropped: Esc, or leaving the field with a refused text.
    onRestore: () => void;
};

// The keys every typed field shares. Enter commits and gives the keyboard back to the level view, Tab
// and clicking away commit, Esc restores the old value. Ctrl+Z acts on the text while it differs from
// the committed value, and on the level once it matches.
export function useFieldTyping({ shownText, fullText, commit, onRestore }: FieldTypingOptions) {
    const { registry, runner, platform } = useCommands();
    // undefined until something is typed, so a value changed elsewhere, or undone, shows at once.
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const [isFocused, setIsFocused] = useState(false);
    // What leaving the field does next: Enter has already committed, and Esc restores.
    const nextBlur = useRef<'commit' | 'restore' | 'nothing'>('commit');

    const restore = () => {
        setDraft(undefined);
        onRestore();
    };

    const tryCommit = () => {
        if (draft === undefined) return true;

        const isDone = commit(draft);
        if (isDone) {
            setDraft(undefined);
        }

        return isDone;
    };

    const handleBlur = () => {
        setIsFocused(false);

        const blurAction = nextBlur.current;
        nextBlur.current = 'commit';
        if (blurAction === 'nothing') return;
        if (blurAction === 'restore') {
            restore();
            return;
        }

        const isDone = tryCommit();
        if (!isDone) {
            restore();
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        const field = event.currentTarget;

        if (event.key === 'Enter') {
            event.preventDefault();
            const isDone = tryCommit();
            if (isDone) {
                nextBlur.current = 'nothing';
                returnKeyboardToLevelView(field);
            }
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            nextBlur.current = 'restore';
            returnKeyboardToLevelView(field);
            return;
        }

        const matchesCommitted = draft === undefined || draft === fullText;
        if (!matchesCommitted) return;

        const historyCommand = levelHistoryCommand(event, registry, platform);
        if (historyCommand === undefined) return;

        event.preventDefault();
        runner.run(historyCommand);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value);

    let text = shownText;
    if (isFocused) {
        text = fullText;
    }
    if (draft !== undefined) {
        text = draft;
    }

    const inputProps = {
        value: text,
        spellCheck: false,
        onFocus: () => setIsFocused(true),
        onChange: handleChange,
        onBlur: handleBlur,
        onKeyDown: handleKeyDown,
    };

    return { inputProps, isFocused };
}

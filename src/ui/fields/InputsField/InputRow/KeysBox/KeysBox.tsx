import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { KeyCodes } from '../../../../../core/triggers/index.ts';
import type { KeyCode } from '../../../../../core/triggers/index.ts';
import './KeysBox.css';

export type KeysBoxProps = {
    name: string;
    keys: readonly KeyCode[];
    isEnabled: boolean;
    onCommit: (keys: readonly KeyCode[]) => void;
};

// An input's keys as one pill, "A, Left arrow". Clicked, it listens: each key a level can use that is
// pressed is added, and leaving the pill makes the pressed keys the input's, in one step. Esc puts the
// old keys back. A key a level can't use, and a shortcut with Ctrl or Alt, passes through untouched.
// It is a read-only text box, so the editor's single-letter keys stay off while it listens.
export function KeysBox({ name, keys, isEnabled, onCommit }: KeysBoxProps) {
    // undefined while it isn't listening.
    const [pressed, setPressed] = useState<readonly KeyCode[] | undefined>(undefined);
    // Esc blurs the pill before the cleared keys render, so leaving it is told to drop them here.
    const isRestoring = useRef(false);

    const startListening = () => {
        isRestoring.current = false;
        setPressed([]);
    };

    const stopListening = () => {
        const hasPressed = pressed !== undefined && pressed.length > 0;
        if (hasPressed && !isRestoring.current) {
            onCommit(pressed);
        }

        setPressed(undefined);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            isRestoring.current = true;
            event.currentTarget.blur();
            return;
        }

        const isShortcut = event.ctrlKey || event.metaKey || event.altKey;
        if (isShortcut) return;

        const { code } = event.nativeEvent;
        if (!KeyCodes.isBindable(code)) return;

        event.preventDefault();
        setPressed((current) => addedKey(current, code));
    };

    let shownText = KeyCodes.labels(keys);
    if (pressed !== undefined) {
        shownText = KeyCodes.labels(pressed);
    }

    let placeholder = 'No key';
    if (pressed !== undefined) {
        placeholder = 'Press keys';
    }

    return (
        <input
            className="keys-box"
            data-listening={pressed !== undefined}
            aria-label={`Keys of ${name}`}
            value={shownText}
            placeholder={placeholder}
            readOnly
            disabled={!isEnabled}
            onFocus={startListening}
            onBlur={stopListening}
            onKeyDown={handleKeyDown}
        />
    );
}

function addedKey(current: readonly KeyCode[] | undefined, code: KeyCode) {
    const keys = current ?? [];
    if (keys.includes(code)) return keys;

    return [...keys, code];
}

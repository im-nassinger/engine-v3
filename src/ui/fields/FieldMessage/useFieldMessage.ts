import { useEffect, useState } from 'react';
import type { FieldMessageTone } from './FieldMessage.tsx';

// How long "Max is 1500" stays under the field after a clamp.
const CLAMP_NOTE_MS = 2000;

export type FieldMessageText = {
    readonly text: string;
    readonly tone: FieldMessageTone;
};

// The message under a typed field: a refusal stays until the next try, a clamp note goes by itself.
export function useFieldMessage() {
    const [message, setMessage] = useState<FieldMessageText | undefined>(undefined);

    const isClampNote = message?.tone === 'clamped';
    useEffect(() => {
        if (!isClampNote) return;

        const timeout = window.setTimeout(() => setMessage(undefined), CLAMP_NOTE_MS);
        return () => window.clearTimeout(timeout);
    }, [isClampNote, message]);

    const refuse = (text: string) => setMessage({ text, tone: 'refused' });
    const clear = () => setMessage(undefined);

    const noteClamp = (note: string | undefined) => {
        if (note === undefined) {
            clear();
            return;
        }

        setMessage({ text: note, tone: 'clamped' });
    };

    return { message, refuse, noteClamp, clear };
}

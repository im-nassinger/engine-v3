import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { TextRequest } from '../../../../editor/commands/index.ts';
import { DialogBox } from '../DialogBox/index.ts';
import './TextDialog.css';

export type TextDialogProps = {
    request: TextRequest;
    onSubmit: (text: string) => void;
    onClose: () => void;
};

// A dialog asking for one line of text, which starts selected so typing replaces it. Enter answers it, but
// not a held Enter, which may be the key that chose the menu entry opening this dialog.
export function TextDialog({ request, onSubmit, onClose }: TextDialogProps) {
    const [text, setText] = useState(request.value);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.repeat || event.nativeEvent.isComposing) return;

        event.preventDefault();
        onSubmit(text);
    };

    return (
        <DialogBox
            title={request.title}
            text={request.text}
            confirmLabel={request.confirmLabel}
            cancelLabel="Cancel"
            onConfirm={() => onSubmit(text)}
            onClose={onClose}
        >
            <input
                className="text-dialog"
                aria-label={request.fieldLabel}
                spellCheck={false}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onFocus={(event) => event.target.select()}
                onKeyDown={handleKeyDown}
            />
        </DialogBox>
    );
}

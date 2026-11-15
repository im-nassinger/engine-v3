import { ValueInput } from '../../../editor/inspector/index.ts';
import { FieldMessage, useFieldMessage } from '../FieldMessage/index.ts';
import { useFieldTyping } from '../typing/useFieldTyping.ts';
import { ColourSwatch } from './ColourSwatch/index.ts';
import './ColourBox.css';

// What the box shows when there is no one colour.
export type NoColour = 'Mixed' | 'None';

export type ColourBoxProps = {
    label: string;
    // #RRGGBBAA, or undefined when there is no one colour.
    colour: string | undefined;
    noColour: NoColour;
    isDisabled: boolean;
    onCommit: (colour: string) => void;
};

// The swatch and the code in capitals. A code typed in the box commits like a number, and a pick in the
// browser's picker commits once. Either keeps the old colour's see-through part when it gives none.
export function ColourBox({ label, colour, noColour, isDisabled, onCommit }: ColourBoxProps) {
    const { message, refuse, clear } = useFieldMessage();

    const commit = (text: string) => {
        const result = ValueInput.parseColour(text, colour);

        if (result.kind === 'invalid') {
            refuse(result.reason);
            return false;
        }

        clear();
        if (result.kind === 'value') {
            onCommit(result.value);
        }

        return true;
    };

    const pick = (pickedRgb: string) => {
        const picked = ValueInput.withPickedColour(pickedRgb, colour);
        clear();
        onCommit(picked);
    };

    const code = colour ?? '';
    const typing = useFieldTyping({ shownText: code, fullText: code, commit, onRestore: clear });
    const isRefused = message?.tone === 'refused';
    const isNone = colour === undefined && noColour === 'None';

    return (
        <div className="colour-box">
            <label className="row" data-refused={isRefused} data-disabled={isDisabled}>
                <ColourSwatch label={label} colour={colour} isNone={isNone} isDisabled={isDisabled} onPick={pick} />
                <input
                    {...typing.inputProps}
                    aria-label={label}
                    aria-invalid={isRefused}
                    placeholder={noColour}
                    disabled={isDisabled}
                />
            </label>
            {message && <FieldMessage text={message.text} tone={message.tone} />}
        </div>
    );
}

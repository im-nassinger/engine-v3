import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { JsonValue } from '../../../../../../../../../../../core/fields/index.ts';
import { TriggerTyping } from '../../../../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerTypedEntry } from '../../../../../../../../../../../editor/entity-inspector/index.ts';
import { NumberBox } from '../../../../../../../../../../fields/index.ts';
import './TriggerTextBox.css';

type TextEntry = TriggerTypedEntry & { readonly kind: 'number' | 'text' | 'word' | 'value' };

export type TriggerTextBoxProps = {
    entry: TextEntry;
    onType: (value: JsonValue) => void;
    onClose: () => void;
};

const PLACEHOLDERS: Record<TextEntry['kind'], string> = {
    number: 'Type a number',
    value: 'Type a value',
    text: 'Type a text',
    word: 'Type a name',
};

// One box: the number pill with its unit, or a box for a text, a name or another value. Enter types it
// in, empty text keeps the word as it was (a text takes it as a value), and text that isn't a value turns
// it red with the reason. A name's says what it takes above the box, and an optional number's has an
// entry that leaves it unset.
export function TriggerTextBox({ entry, onType, onClose }: TriggerTextBoxProps) {
    const [text, setText] = useState(() => TriggerTyping.shownText(entry));
    const [refusal, setRefusal] = useState<string | undefined>(undefined);

    const typeIn = () => {
        const result = TriggerTyping.parse(entry, text);
        if (result.kind === 'restore') {
            onClose();
        } else if (result.kind === 'invalid') {
            setRefusal(result.reason);
        } else {
            onType(result.value);
        }
    };

    const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        typeIn();
    };

    const changeText = (typed: string) => {
        setText(typed);
        setRefusal(undefined);
    };

    const inputProps = {
        value: text,
        placeholder: PLACEHOLDERS[entry.kind],
        autoFocus: true,
        onChange: (event: { target: { value: string } }) => changeText(event.target.value),
        onKeyDown: handleKey,
    };

    const unit = entry.kind === 'number' ? entry.unit : undefined;
    const clearLabel = entry.kind === 'number' ? entry.clearLabel : undefined;
    const isRefused = refusal !== undefined;

    return (
        <div className="trigger-text-box">
            {entry.kind === 'word' && <span className="hint">{entry.hint}</span>}
            {entry.kind === 'number' && (
                <NumberBox
                    label="Value"
                    unit={unit}
                    inputProps={inputProps}
                    isMixed={false}
                    isRefused={isRefused}
                    isDisabled={false}
                />
            )}
            {entry.kind !== 'number' && (
                <input className="text" aria-label="Value" aria-invalid={isRefused} {...inputProps} />
            )}
            {refusal !== undefined && <span className="refusal">{refusal}</span>}
            {clearLabel !== undefined && (
                <button type="button" className="clear" onClick={() => onType(null)}>
                    {clearLabel}
                </button>
            )}
        </div>
    );
}

import { useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { JsonValue } from '../../../../../../../../../../core/fields/index.ts';
import { TriggerTyping } from '../../../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerTypedEntry } from '../../../../../../../../../../editor/entity-inspector/index.ts';
import { rectOf, usePopupClosing, usePopupPlacement } from '../../../../../../../../../shared/index.ts';
import './TriggerWordField.css';

export type TriggerWordFieldProps = {
    entry: TriggerTypedEntry;
    anchor: RefObject<HTMLElement | null>;
    onType: (value: JsonValue) => void;
    onClose: () => void;
};

const GAP_PX = 4;

const PLACEHOLDERS: Record<TriggerTypedEntry['kind'], string> = {
    number: 'Type a number',
    value: 'Type a value',
    text: 'Text',
    word: 'Type a name',
};

// The small field a number, a value, a text or a name word opens under itself. Enter types it in, empty
// text keeps the word as it was (a text takes it as a value), and text that isn't a value turns it red with
// the reason; Esc and a press outside close it. A name's field says what it takes above the box, and an
// optional number's has an entry that leaves it unset.
export function TriggerWordField({ entry, anchor, onType, onClose }: TriggerWordFieldProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [text, setText] = useState(() => TriggerTyping.shownText(entry));
    const [refusal, setRefusal] = useState<string | undefined>(undefined);
    usePopupClosing(rootRef, anchor, onClose);

    const readAnchor = () => rectOf(anchor);
    usePopupPlacement(rootRef, readAnchor, { side: 'below', align: 'start', gapPx: GAP_PX });

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

    const unit = entry.kind === 'number' ? entry.unit : undefined;
    const clearLabel = entry.kind === 'number' ? entry.clearLabel : undefined;

    return (
        <div className="trigger-word-field" data-kind={entry.kind} ref={rootRef}>
            {entry.kind === 'word' && <span className="hint">{entry.hint}</span>}
            <input
                aria-label="Value"
                aria-invalid={refusal !== undefined}
                inputMode={entry.kind === 'number' ? 'decimal' : undefined}
                placeholder={PLACEHOLDERS[entry.kind]}
                value={text}
                autoFocus
                onChange={(event) => changeText(event.target.value)}
                onKeyDown={handleKey}
            />
            {unit !== undefined && <span className="unit">{unit}</span>}
            {refusal !== undefined && <span className="refusal">{refusal}</span>}
            {clearLabel !== undefined && (
                <button type="button" className="clear" onClick={() => onType(null)}>
                    {clearLabel}
                </button>
            )}
        </div>
    );
}

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

// The small field a number or a value word opens under itself. Enter types it in, empty text keeps the
// word as it was, and text that isn't a value turns it red with the reason; Esc and a press outside close it.
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

    return (
        <div className="trigger-word-field" ref={rootRef}>
            <input
                aria-label="Value"
                aria-invalid={refusal !== undefined}
                inputMode={entry.kind === 'number' ? 'decimal' : undefined}
                value={text}
                autoFocus
                onChange={(event) => changeText(event.target.value)}
                onKeyDown={handleKey}
            />
            {unit !== undefined && <span className="unit">{unit}</span>}
            {refusal !== undefined && <span className="refusal">{refusal}</span>}
        </div>
    );
}

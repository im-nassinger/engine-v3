import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { JsonValue } from '../../../../../../../../../../../core/fields/index.ts';
import { TriggerTyping } from '../../../../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerTypedEntry } from '../../../../../../../../../../../editor/entity-inspector/index.ts';
import { NumberBox } from '../../../../../../../../../../fields/index.ts';
import './TriggerVectorBoxes.css';

type VectorEntry = TriggerTypedEntry & { readonly kind: 'vector' };

export type TriggerVectorBoxesProps = {
    entry: VectorEntry;
    onType: (value: JsonValue) => void;
    onClose: () => void;
};

// Two pills side by side, X and Y, as a vector field has. Tab moves between them; Enter in either types
// in both, an empty one keeping its axis (or 0). A box that isn't a number turns red with the reason.
export function TriggerVectorBoxes({ entry, onType }: TriggerVectorBoxesProps) {
    const [xText, setXText] = useState(() => axisText(entry, 'x'));
    const [yText, setYText] = useState(() => axisText(entry, 'y'));
    const [refusal, setRefusal] = useState<string | undefined>(undefined);

    const typeIn = () => {
        const result = TriggerTyping.parseAxes(entry, xText, yText);
        if (result.kind === 'invalid') {
            setRefusal(result.reason);
            return;
        }
        if (result.kind !== 'value') return;

        onType(result.value);
    };

    const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        typeIn();
    };

    const boxProps = (text: string, setText: (typed: string) => void, isFirst: boolean) => ({
        value: text,
        autoFocus: isFirst,
        onChange: (event: { target: { value: string } }) => {
            setText(event.target.value);
            setRefusal(undefined);
        },
        onKeyDown: handleKey,
    });

    const isRefused = refusal !== undefined;

    return (
        <div className="trigger-vector-boxes">
            <div className="boxes">
                <NumberBox
                    label="X"
                    axisLetter="X"
                    unit={entry.unit}
                    inputProps={boxProps(xText, setXText, true)}
                    isMixed={false}
                    isRefused={isRefused}
                    isDisabled={false}
                />
                <NumberBox
                    label="Y"
                    axisLetter="Y"
                    unit={entry.unit}
                    inputProps={boxProps(yText, setYText, false)}
                    isMixed={false}
                    isRefused={isRefused}
                    isDisabled={false}
                />
            </div>
            {refusal !== undefined && <span className="refusal">{refusal}</span>}
        </div>
    );
}

function axisText(entry: VectorEntry, axis: 'x' | 'y') {
    if (entry.value === null) return '';

    return String(entry.value[axis]);
}

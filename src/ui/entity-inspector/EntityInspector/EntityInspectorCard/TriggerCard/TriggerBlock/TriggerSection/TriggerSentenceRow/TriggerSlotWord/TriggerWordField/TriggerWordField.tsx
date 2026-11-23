import { useRef } from 'react';
import type { RefObject } from 'react';
import type { JsonValue } from '../../../../../../../../../../core/fields/index.ts';
import { TriggerTyping } from '../../../../../../../../../../editor/entity-inspector/index.ts';
import type { TriggerTypedEntry } from '../../../../../../../../../../editor/entity-inspector/index.ts';
import { ColourBox } from '../../../../../../../../../fields/index.ts';
import { rectOf, usePopupClosing, usePopupPlacement } from '../../../../../../../../../shared/index.ts';
import { TriggerTextBox } from './TriggerTextBox/index.ts';
import { TriggerVectorBoxes } from './TriggerVectorBoxes/index.ts';
import './TriggerWordField.css';

export type TriggerWordFieldProps = {
    entry: TriggerTypedEntry;
    anchor: RefObject<HTMLElement | null>;
    onType: (value: JsonValue) => void;
    onClose: () => void;
};

const GAP_PX = 4;

// The small field a typed word opens under itself, with the inspector's own boxes: the number pill with
// its unit, two pills X and Y for a vector, the colour box with its swatch, or a box for a text or a name.
// Esc and a press outside close it.
export function TriggerWordField({ entry, anchor, onType, onClose }: TriggerWordFieldProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    usePopupClosing(rootRef, anchor, onClose);

    const readAnchor = () => rectOf(anchor);
    usePopupPlacement(rootRef, readAnchor, { side: 'below', align: 'start', gapPx: GAP_PX });

    return (
        <div className="trigger-word-field" data-kind={entry.kind} ref={rootRef}>
            <TypedBox entry={entry} onType={onType} onClose={onClose} />
        </div>
    );
}

type TypedBoxProps = Omit<TriggerWordFieldProps, 'anchor'>;

function TypedBox({ entry, onType, onClose }: TypedBoxProps) {
    if (entry.kind === 'vector') return <TriggerVectorBoxes entry={entry} onType={onType} onClose={onClose} />;
    if (entry.kind === 'colour') {
        const colour = entry.value ?? undefined;
        const typeColour = (typed: string) => onType(TriggerTyping.colourValue(entry, typed));
        return <ColourBox label="Colour" colour={colour} noColour="None" isDisabled={false} onCommit={typeColour} />;
    }

    return <TriggerTextBox entry={entry} onType={onType} onClose={onClose} />;
}

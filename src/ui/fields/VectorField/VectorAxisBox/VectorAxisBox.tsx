import type { Axis } from '../../../../editor/commands/index.ts';
import { ValueInput } from '../../../../editor/inspector/index.ts';
import type { Mixed, NumberInputDefinition } from '../../../../editor/inspector/index.ts';
import { FieldMessage, useFieldMessage } from '../../FieldMessage/index.ts';
import { NumberBox } from '../../NumberBox/index.ts';
import { useFieldTyping } from '../../typing/useFieldTyping.ts';
import './VectorAxisBox.css';

export type VectorAxisBoxProps = {
    axis: Axis;
    definition: NumberInputDefinition;
    value: number | Mixed;
    isDisabled: boolean;
    onCommit: (axis: Axis, value: number) => void;
};

// One axis of a vector field, with its letter, its own red outline and its own message: a scale of 0
// is refused in either box.
export function VectorAxisBox({ axis, definition, value, isDisabled, onCommit }: VectorAxisBoxProps) {
    const { message, refuse, noteClamp, clear } = useFieldMessage();
    const axisLetter = axis.toUpperCase();

    const commit = (text: string) => {
        const result = ValueInput.parseNumber(text, definition);

        if (result.kind === 'invalid') {
            refuse(result.reason);
            return false;
        }

        if (result.kind === 'restore') {
            clear();
            return true;
        }

        onCommit(axis, result.value);
        noteClamp(result.note);
        return true;
    };

    let shownText = '';
    let fullText = '';
    if (typeof value === 'number') {
        shownText = ValueInput.format(value, definition);
        fullText = ValueInput.formatFull(value, definition);
    }

    const typing = useFieldTyping({ shownText, fullText, commit, onRestore: clear });
    const isMixed = typeof value !== 'number';
    const isRefused = message?.tone === 'refused';

    return (
        <div className="vector-axis-box" data-axis={axis}>
            <NumberBox
                label={`${definition.label} ${axisLetter}`}
                axisLetter={axisLetter}
                unit={definition.unit}
                inputProps={typing.inputProps}
                isMixed={isMixed && !typing.isFocused}
                isRefused={isRefused}
                isDisabled={isDisabled}
            />
            {message && <FieldMessage text={message.text} tone={message.tone} />}
        </div>
    );
}

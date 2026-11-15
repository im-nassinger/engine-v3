import { useState } from 'react';
import { MIXED, ValueInput } from '../../../editor/inspector/index.ts';
import { FieldMessage, useFieldMessage } from '../FieldMessage/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { NumberBox } from '../NumberBox/index.ts';
import { numberInputOf, sliderRangeOf } from '../typing/numberInputOf.ts';
import { useFieldTyping } from '../typing/useFieldTyping.ts';
import { FieldSlider } from './FieldSlider/index.ts';
import './NumberField.css';

// A number or an angle: the box with its faded unit, and a slider when it has both limits. A value that
// can't be read gets a red outline and its reason under the box; one past a limit is clamped, with a
// brief note saying so.
export function NumberField({ field, onCommit }: FieldProps) {
    const definition = numberInputOf(field);
    const { message, refuse, noteClamp, clear } = useFieldMessage();
    // The value the slider is dragged to, shown in the box until it is let go.
    const [slidingValue, setSlidingValue] = useState<number | undefined>(undefined);

    const commitValue = (value: number, note: string | undefined) => {
        onCommit(value);
        noteClamp(note);
    };

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

        commitValue(result.value, result.note);
        return true;
    };

    const releaseSlider = (value: number) => {
        setSlidingValue(undefined);
        commitValue(value, undefined);
    };

    const value = field.value;
    const isMixed = value === MIXED;
    let storedValue: number | undefined;
    if (typeof value === 'number') {
        storedValue = value;
    }
    const shownValue = slidingValue ?? storedValue;

    let shownText = '';
    let fullText = '';
    if (shownValue !== undefined) {
        shownText = ValueInput.format(shownValue, definition);
        fullText = ValueInput.formatFull(shownValue, definition);
    }

    const typing = useFieldTyping({ shownText, fullText, commit, onRestore: clear });

    const isRefused = message?.tone === 'refused';
    const sliderRange = sliderRangeOf(definition);
    const slider = sliderRange && (
        <FieldSlider
            label={definition.label}
            range={sliderRange}
            definition={definition}
            value={shownValue}
            isDisabled={!field.isEnabled}
            onSlide={setSlidingValue}
            onRelease={releaseSlider}
        />
    );

    return (
        <div className="number-field" data-slider={sliderRange !== undefined}>
            <div className="row">
                <NumberBox
                    label={definition.label}
                    unit={definition.unit}
                    inputProps={typing.inputProps}
                    isMixed={isMixed && !typing.isFocused}
                    isRefused={isRefused}
                    isDisabled={!field.isEnabled}
                />
                {slider}
            </div>
            {message && <FieldMessage text={message.text} tone={message.tone} />}
        </div>
    );
}

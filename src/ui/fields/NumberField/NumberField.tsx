import { useState } from 'react';
import { MIXED, ValueInput } from '../../../editor/entity-inspector/index.ts';
import { useLengthDisplay } from '../../hooks/index.ts';
import { FieldMessage, useFieldMessage } from '../FieldMessage/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { NumberBox } from '../NumberBox/index.ts';
import { numberInputOf, sliderRangeOf } from '../typing/numberInputOf.ts';
import { useFieldTyping } from '../typing/useFieldTyping.ts';
import { filledShareOf, sliderStepOf } from './slider/sliderValue.ts';
import { useFieldSlider } from './slider/useFieldSlider.ts';
import './NumberField.css';

// A number or an angle: the pill with its faded unit, a filled slider when it has both limits, changing
// the level while dragged when given slide handlers. A value that can't be read gets a red ring and its
// reason under the pill; one past a limit is clamped, with a brief note saying so.
export function NumberField({ field, onCommit, slide }: FieldProps) {
    const lengths = useLengthDisplay();
    const definition = numberInputOf(field, lengths);
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

    const slideSlider = (value: number) => {
        setSlidingValue(value);
        slide?.slideTo(value);
    };

    const releaseSlider = (value: number) => {
        setSlidingValue(undefined);
        if (slide === undefined) {
            commitValue(value, undefined);
            return;
        }

        clear();
        slide.release(value);
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
    const sliderHandlers = useFieldSlider({
        range: sliderRange,
        step: sliderStepOf(definition),
        isDisabled: !field.isEnabled,
        onSlide: slideSlider,
        onRelease: releaseSlider,
    });
    const slider = sliderRange && { filledShare: filledShareOf(shownValue, sliderRange), handlers: sliderHandlers };

    return (
        <div className="number-field">
            <NumberBox
                label={definition.label}
                unit={definition.unit}
                inputProps={typing.inputProps}
                isMixed={isMixed && !typing.isFocused}
                isRefused={isRefused}
                isDisabled={!field.isEnabled}
                slider={slider}
            />
            {message && <FieldMessage text={message.text} tone={message.tone} />}
        </div>
    );
}

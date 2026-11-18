import { useEffect, useRef } from 'react';
import { MIXED } from '../../../editor/entity-inspector/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import './CheckboxField.css';

// One click is one step. Mixed shows as the browser's in-between state, and a click ticks them all.
export function CheckboxField({ field, onCommit }: FieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const isMixed = field.value === MIXED;
    const isChecked = field.value === true;

    useEffect(() => {
        const input = inputRef.current;
        if (input === null) return;

        input.indeterminate = isMixed;
    }, [isMixed]);

    const toggle = () => onCommit(!isChecked);

    return (
        <input
            ref={inputRef}
            className="checkbox-field"
            type="checkbox"
            aria-label={field.definition.label}
            checked={isChecked}
            disabled={!field.isEnabled}
            onChange={toggle}
        />
    );
}

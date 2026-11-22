import { MIXED } from '../../../editor/entity-inspector/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { useFieldTyping } from '../typing/useFieldTyping.ts';
import './TextField.css';

// A text, committed like a number. A refused text gives its reason as status text, and the old text
// comes back.
export function TextField({ field, onCommit }: FieldProps) {
    const value = field.value;
    const isMixed = value === MIXED;
    let text = '';
    if (typeof value === 'string') {
        text = value;
    }

    const commit = (typedText: string) => {
        onCommit(typedText);
        return true;
    };

    const typing = useFieldTyping({ shownText: text, fullText: text, commit, onRestore: () => {} });
    const definition = field.definition;
    const ownPlaceholder = 'placeholder' in definition ? definition.placeholder : undefined;
    const placeholder = isMixed ? 'Mixed' : ownPlaceholder;

    return (
        <input
            {...typing.inputProps}
            className="text-field"
            aria-label={field.definition.label}
            placeholder={placeholder}
            disabled={!field.isEnabled}
        />
    );
}

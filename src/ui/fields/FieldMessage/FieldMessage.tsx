import './FieldMessage.css';

export type FieldMessageTone = 'refused' | 'clamped';

export type FieldMessageProps = {
    text: string;
    tone: FieldMessageTone;
};

// The line under a field: why a typed value was refused, in red, or the brief clamp note.
export function FieldMessage({ text, tone }: FieldMessageProps) {
    const role = tone === 'refused' ? 'alert' : 'status';

    return (
        <span className="field-message" data-tone={tone} role={role}>
            {text}
        </span>
    );
}

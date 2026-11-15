import './Button.css';

export type ButtonVariant = 'normal' | 'primary';

export type ButtonProps = {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
    isDisabled?: boolean;
};

// aria-disabled instead of disabled: a disabled button gets no pointer events, so its tooltip couldn't say why.
export function Button({ label, onClick, variant = 'normal', isDisabled = false }: ButtonProps) {
    const handleClick = () => {
        if (isDisabled) return;

        onClick();
    };

    return (
        <button
            type="button"
            className="button"
            data-variant={variant}
            aria-disabled={isDisabled}
            onClick={handleClick}
        >
            {label}
        </button>
    );
}

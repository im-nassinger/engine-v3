import { Plus } from 'lucide-react';
import { Icon } from '../../../../shared/index.ts';
import './AddStopButton.css';

export type AddStopButtonProps = {
    isDisabled: boolean;
    onAdd: () => void;
};

// `+ Add stop`, a link in the accent's text colour. aria-disabled, as Button does, so it stays focusable.
export function AddStopButton({ isDisabled, onAdd }: AddStopButtonProps) {
    const handleClick = () => {
        if (isDisabled) return;

        onAdd();
    };

    return (
        <button type="button" className="add-stop-button" aria-disabled={isDisabled} onClick={handleClick}>
            <Icon icon={Plus} />
            Add stop
        </button>
    );
}

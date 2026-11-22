import { Plus } from 'lucide-react';
import { Icon } from '../Icon/index.ts';
import './AddRow.css';

export type AddRowProps = {
    label: string;
    onAdd: () => void;
    isDisabled?: boolean;
};

// The row at the end of a list of rows that adds one, such as Add variable: a + then its label in muted
// text, with no background until hovered.
export function AddRow({ label, onAdd, isDisabled = false }: AddRowProps) {
    return (
        <button type="button" className="add-row" disabled={isDisabled} onClick={onAdd}>
            <Icon icon={Plus} size="small" />
            <span>{label}</span>
        </button>
    );
}

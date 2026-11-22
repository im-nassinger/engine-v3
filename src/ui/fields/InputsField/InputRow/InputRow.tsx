import { X } from 'lucide-react';
import type { Input } from '../../../../core/fields/index.ts';
import type { KeyCode } from '../../../../core/triggers/index.ts';
import { IconButton } from '../../../shared/index.ts';
import { useFieldTyping } from '../../typing/useFieldTyping.ts';
import { KeysBox } from './KeysBox/index.ts';
import './InputRow.css';

export type InputRowProps = {
    input: Input;
    index: number;
    isEnabled: boolean;
    onRename: (index: number, typedName: string) => void;
    onSetKeys: (index: number, keys: readonly KeyCode[]) => void;
    onRemove: (index: number) => void;
};

// One input: its name as the row's label, typed in place, its keys as one pill changed by pressing keys,
// and its ×.
export function InputRow({ input, index, isEnabled, onRename, onSetKeys, onRemove }: InputRowProps) {
    const { name } = input;

    const commitName = (typedName: string) => {
        if (typedName !== name) {
            onRename(index, typedName);
        }

        return true;
    };

    const typing = useFieldTyping({ shownText: name, fullText: name, commit: commitName, onRestore: () => {} });
    const commitKeys = (keys: readonly KeyCode[]) => onSetKeys(index, keys);

    return (
        <div className="input-row" data-index={index}>
            <input
                {...typing.inputProps}
                className="name"
                aria-label={`Name of ${name}`}
                spellCheck={false}
                disabled={!isEnabled}
            />
            <KeysBox name={name} keys={input.keys} isEnabled={isEnabled} onCommit={commitKeys} />
            <IconButton icon={X} label={`Remove ${name}`} look="quiet" onClick={() => onRemove(index)} />
        </div>
    );
}

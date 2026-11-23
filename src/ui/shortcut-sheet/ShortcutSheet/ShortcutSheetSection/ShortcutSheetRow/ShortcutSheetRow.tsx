import { Fragment } from 'react';
import type { ShortcutKeys, ShortcutRow } from '../../../../../editor/shortcuts/index.ts';
import './ShortcutSheetRow.css';

export type ShortcutSheetRowProps = {
    row: ShortcutRow;
};

// What a shortcut does, and each way to press it as key caps, a second way after "or".
export function ShortcutSheetRow({ row }: ShortcutSheetRowProps) {
    return (
        <div className="shortcut-sheet-row">
            <span className="name">{row.name}</span>
            <span className="keys">
                {row.keys.map((keys, index) => (
                    <KeyCaps key={keys.join('+')} keys={keys} isFirst={index === 0} />
                ))}
            </span>
        </div>
    );
}

type KeyCapsProps = {
    keys: ShortcutKeys;
    isFirst: boolean;
};

function KeyCaps({ keys, isFirst }: KeyCapsProps) {
    return (
        <>
            {!isFirst && <span className="or">or</span>}
            {keys.map((key, index) => (
                <Fragment key={key}>
                    {index > 0 && <span className="plus">+</span>}
                    <kbd>{key}</kbd>
                </Fragment>
            ))}
        </>
    );
}

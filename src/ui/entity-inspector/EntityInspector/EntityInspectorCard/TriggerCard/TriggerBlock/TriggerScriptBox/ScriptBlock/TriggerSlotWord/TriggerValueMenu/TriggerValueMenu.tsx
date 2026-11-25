import type { RefObject } from 'react';
import type { JsonValue } from '../../../../../../../../../../core/fields/index.ts';
import { Menu } from '../../../../../../../../../shared/index.ts';
import type { MenuEntry } from '../../../../../../../../../shared/index.ts';
import { TriggerTextBox } from '../TriggerTextBox/index.ts';
import type { TriggerTextEntry } from '../TriggerTextBox/index.ts';
import './TriggerValueMenu.css';

export type TriggerValueMenuProps = {
    // The box to type a value into, above the menu; undefined for a box whose values are picked, such as
    // true or false.
    typed: TriggerTextEntry | undefined;
    // The values to pick, if any, then the variables of the box's type in their groups.
    entries: MenuEntry[];
    anchor: RefObject<HTMLElement | null>;
    onType: (value: JsonValue) => void;
    onClose: () => void;
};

// What a value box that takes variables opens (v4 fix 10): its typed box on top, as the small field has it,
// then the variables it may hold instead, grouped as the variable menu groups them. Typing a value
// switches the box back from a variable.
export function TriggerValueMenu({ typed, entries, anchor, onType, onClose }: TriggerValueMenuProps) {
    const header =
        typed === undefined ? undefined : (
            <div className="trigger-value-menu">
                <TriggerTextBox entry={typed} onType={onType} onClose={onClose} />
            </div>
        );

    return <Menu entries={entries} onClose={onClose} anchor={anchor} header={header} />;
}

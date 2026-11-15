import { ChoiceFieldType } from '../../../core/fields/index.ts';
import { MIXED } from '../../../editor/inspector/index.ts';
import { Menu, MenuButton, useOpenMenu } from '../../shared/index.ts';
import type { MenuEntry } from '../../shared/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import './ChoiceField.css';

type Option = {
    readonly value: string;
    readonly label: string;
};

// The chosen option and a small down arrow; picking one is one step.
export function ChoiceField({ field, onCommit }: FieldProps) {
    const options = optionsOf(field);
    const isMixed = field.value === MIXED;
    const chosen = options.find((option) => option.value === field.value);
    const chosenText = chosen?.label ?? 'Mixed';

    const menu = <ChoiceMenu options={options} chosenValue={field.value} onChoose={onCommit} />;

    return (
        <span className="choice-field" data-mixed={isMixed}>
            <MenuButton label={field.definition.label} menu={menu} look="field" isDisabled={!field.isEnabled} hasArrow>
                <span className="chosen">{chosenText}</span>
            </MenuButton>
        </span>
    );
}

type ChoiceMenuProps = {
    options: readonly Option[];
    chosenValue: unknown;
    onChoose: (value: string) => void;
};

function ChoiceMenu({ options, chosenValue, onChoose }: ChoiceMenuProps) {
    const { close, anchor } = useOpenMenu();

    const entries: MenuEntry[] = options.map((option) => ({
        kind: 'action',
        id: option.value,
        label: option.label,
        checked: option.value === chosenValue,
        onChoose: () => onChoose(option.value),
    }));

    return <Menu entries={entries} onClose={close} anchor={anchor} />;
}

function optionsOf(field: FieldProps['field']): readonly Option[] {
    if (field.kind === 'readOnlyRow') throw new Error('A read-only row has no options.');

    const type = field.definition.type;
    if (!(type instanceof ChoiceFieldType)) throw new Error(`${field.definition.label} isn't a choice field.`);

    return type.options;
}

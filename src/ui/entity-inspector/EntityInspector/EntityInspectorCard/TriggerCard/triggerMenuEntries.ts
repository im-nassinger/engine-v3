import type {
    TriggerChoice,
    TriggerMenuGroup,
    TriggerWordEntry,
} from '../../../../../editor/entity-inspector/index.ts';
import type { MenuEntry, MenuItem } from '../../../../shared/index.ts';

type MenuWordEntry = TriggerWordEntry & { readonly kind: 'menu' | 'groups' | 'submenus' };

// A trigger word's menu, or Add check's and Add action's: its items, or each group under its title with a
// line before every group after the first (a group with no item says so, disabled), or items that open
// submenus, such as a component opening its values.
export function triggerMenuEntries(entry: MenuWordEntry, pick: (choice: TriggerChoice) => void): MenuEntry[] {
    if (entry.kind === 'menu') return actionsOf(entry.choices, pick, 'item');
    if (entry.kind === 'submenus') {
        return entry.submenus.map((submenu, index) => submenuOf(submenu, pick, `submenu-${index}`));
    }

    return entry.groups.flatMap((group, index) => groupEntries(group, index, pick));
}

// A group under its title, with a line before it after the first group; a group with no item says so, disabled.
export function groupEntries(group: TriggerMenuGroup, index: number, pick: (choice: TriggerChoice) => void) {
    const entries: MenuEntry[] = [];
    if (index > 0) {
        entries.push({ kind: 'separator', id: `separator-${index}` });
    }
    entries.push({ kind: 'heading', id: `heading-${index}`, label: group.title });
    entries.push(...actionsOf(group.choices, pick, `group-${index}`));

    const submenus = group.submenus ?? [];
    submenus.forEach((submenu, submenuIndex) => {
        entries.push(submenuOf(submenu, pick, `group-${index}-submenu-${submenuIndex}`));
    });

    const isEmpty = group.choices.length === 0 && submenus.length === 0;
    if (isEmpty && group.emptyText !== undefined) {
        const empty = group.emptyText;
        entries.push({ kind: 'action', id: `empty-${index}`, label: empty, onChoose: () => {}, disabledReason: empty });
    }

    return entries;
}

function submenuOf(
    submenu: { readonly label: string; readonly choices: readonly TriggerChoice[] },
    pick: (choice: TriggerChoice) => void,
    id: string,
): MenuEntry {
    const entries = actionsOf(submenu.choices, pick, id);

    return { kind: 'submenu', id, label: submenu.label, entries };
}

export function actionsOf(choices: readonly TriggerChoice[], pick: (choice: TriggerChoice) => void, idPrefix: string) {
    return choices.map((choice, index) => {
        const entry: MenuItem = {
            kind: 'action',
            id: `${idPrefix}-${index}`,
            label: choice.label,
            onChoose: () => pick(choice),
            disabledReason: choice.disabledReason,
            note: choice.note,
            description: choice.description,
        };

        return entry;
    });
}

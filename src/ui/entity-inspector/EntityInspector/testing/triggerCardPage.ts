import { buttonNamed, requireCard, requireElement } from './entityInspectorPage.ts';

// Reading and clicking the Triggers card: its blocks, their sections and sentences, the words and menus.

export function triggersCard() {
    return requireCard('TriggerComponent');
}

export function blocks() {
    return [...triggersCard().querySelectorAll<HTMLElement>('.trigger-block')];
}

export function requireBlock(index = 0) {
    const block = blocks()[index];
    if (block === undefined) throw new Error(`No trigger block ${index}.`);

    return block;
}

export function blockName(index = 0) {
    return requireElement(requireBlock(index), '.trigger-head .name').textContent;
}

export function section(title: string, blockIndex = 0) {
    return requireElement<HTMLElement>(requireBlock(blockIndex), `.trigger-section[data-section="${title}"]`);
}

export function sentences(title: string, blockIndex = 0) {
    const rows = section(title, blockIndex).querySelectorAll<HTMLElement>('.trigger-sentence-row');

    return [...rows].map((row) => {
        const words = row.querySelectorAll<HTMLElement>('.text, .trigger-slot-word');
        return [...words].map((word) => word.textContent).join(' ');
    });
}

export function word(title: string, text: string, blockIndex = 0) {
    const words = section(title, blockIndex).querySelectorAll<HTMLElement>('.trigger-slot-word');
    const found = [...words].find((candidate) => candidate.textContent === text);
    if (found === undefined) throw new Error(`No word ${text} in ${title}.`);

    return found;
}

// A menu's rows, or the rows above the entity picker's tree.
export function menuRows() {
    return [...document.querySelectorAll<HTMLElement>('.menu [role="menuitem"], .entity-picker [role="menuitem"]')];
}

// The entity picker's tree rows, by name.
export function pickerRowNamed(name: string) {
    const rows = document.querySelectorAll<HTMLElement>('.entity-picker [role="treeitem"]');

    return [...rows].find((row) => row.querySelector('.name')?.textContent === name);
}

// By its label, not its faint word at the right.
export function menuRowNamed(label: string) {
    return menuRows().find((candidate) => labelOf(candidate) === label);
}

// A row with a description has its label first, then the description.
function labelOf(row: HTMLElement) {
    const label = row.querySelector('.label');
    const first = label?.firstElementChild ?? label;

    return first?.textContent.trim();
}

export function addRow(label: string, blockIndex = 0) {
    return buttonNamed(requireBlock(blockIndex), label);
}

export function notesOf(blockIndex = 0) {
    const notes = requireBlock(blockIndex).querySelectorAll<HTMLElement>('.card-note-box .text');

    return [...notes].map((note) => note.textContent.trim());
}

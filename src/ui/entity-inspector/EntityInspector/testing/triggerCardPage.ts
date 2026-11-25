import { requireCard, requireElement } from './entityInspectorPage.ts';

// Reading and clicking the Triggers card: its triggers, their Scratch blocks and parts, the words and menus.

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
    return requireElement<HTMLInputElement>(requireBlock(index), 'input[aria-label="Trigger name"]').value;
}

// The script's parts by the sections they were once drawn in: When is the event block's words, If its
// checks, Do its actions, each one part of a block.
const PART_OF_TITLE: Record<string, string> = { When: 'when', If: 'check', Do: 'action' };

export function parts(title: string, blockIndex = 0) {
    const part = PART_OF_TITLE[title];
    const groups = requireBlock(blockIndex).querySelectorAll<HTMLElement>(
        `.script-block .group[data-section="${part}"]`,
    );

    return [...groups];
}

export function sentences(title: string, blockIndex = 0) {
    return parts(title, blockIndex).map((group) => {
        const words = group.querySelectorAll<HTMLElement>('.text, .trigger-slot-word');
        return [...words].map((shown) => shown.textContent).join(' ');
    });
}

export function word(title: string, text: string, blockIndex = 0) {
    const words = parts(title, blockIndex).flatMap((group) => [
        ...group.querySelectorAll<HTMLElement>('.trigger-slot-word'),
    ]);
    const found = words.find((candidate) => candidate.textContent === text);
    if (found === undefined) throw new Error(`No word ${text} in ${title}.`);

    return found;
}

// The script's blocks, top to bottom: the event, the If's bars, the actions.
export function scriptBlocks(blockIndex = 0) {
    return [...requireBlock(blockIndex).querySelectorAll<HTMLElement>('.script-block')];
}

// The "add a block" slot of a gap while it shows (opening, open or closing), if it does.
export function slotAt(gap: number, blockIndex = 0) {
    return requireBlock(blockIndex).querySelector<HTMLElement>(`.script-slot[data-gap="${gap}"][data-shown="true"]`);
}

// Every slot that shows.
export function shownSlots(blockIndex = 0) {
    return [...requireBlock(blockIndex).querySelectorAll<HTMLElement>('.script-slot[data-shown="true"]')];
}

// The button a shown slot's menu opens from.
export function slotButton(gap: number, blockIndex = 0) {
    const slot = slotAt(gap, blockIndex);
    if (slot === null) throw new Error(`The slot of gap ${gap} doesn't show.`);

    return requireElement<HTMLElement>(slot, '.body');
}

// The block whose top or bottom third opens a gap's slot.
export function blockBeside(gap: number, side: 'above' | 'below', blockIndex = 0) {
    const attribute = side === 'above' ? 'data-gap-below' : 'data-gap-above';

    return requireElement<HTMLElement>(requireBlock(blockIndex), `.script-block[${attribute}="${gap}"]`);
}

// The last gap: after the last action, inside the If when there is one.
export function lastGap(blockIndex = 0) {
    const gaps = scriptBlocks(blockIndex).map((block) => Number(block.dataset['gapBelow'] ?? -1));

    return Math.max(...gaps);
}

// How far the tooth hangs below a block's body; the bands leave it out.
const TOOTH_PX = 6;
const EDGE_PX = 3;

// A point on a block's top, middle or bottom third, at its left end, for userEvent.hover. The block above
// covers the top 6 px of a block with its own bottom, so the top third is reached under them.
export function bandPoint(block: HTMLElement, band: 'top' | 'middle' | 'bottom') {
    const bodyHeight = block.getBoundingClientRect().height - TOOTH_PX;
    let y = bodyHeight / 2;
    if (band === 'top') {
        y = TOOTH_PX + EDGE_PX;
    } else if (band === 'bottom') {
        y = bodyHeight - EDGE_PX;
    }

    return { position: { x: EDGE_PX, y } };
}

// Right-clicks a block at its left end, halfway down, opening its context menu.
export function openContextMenu(block: HTMLElement) {
    const rect = block.getBoundingClientRect();
    const clientX = rect.left + EDGE_PX;
    const clientY = rect.top + rect.height / 2;
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY });
    block.dispatchEvent(event);

    return event;
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

export function notesOf(blockIndex = 0) {
    const notes = requireBlock(blockIndex).querySelectorAll<HTMLElement>('.card-note-box .text');

    return [...notes].map((note) => note.textContent.trim());
}

// The box a value word opens to type into: the small field, or the typed box above a value box's variables
// (fix 10).
export const TYPED_BOX = '.trigger-word-field, .trigger-value-menu';
export const TYPED_INPUT = '.trigger-word-field input, .trigger-value-menu input';

import { labelName } from '../../core/level/index.ts';
import type { Entity } from '../../core/level/index.ts';

// The status bar's selection slot: the one entity's name, or a count, as the Entity inspector's header
// counts. Nothing selected shows nothing, since the Entity inspector then already shows the World.
export function selectionSummary(selected: readonly Entity[]) {
    const onlyEntity = selected.length === 1 ? selected[0] : undefined;
    if (onlyEntity !== undefined) return `Selected: ${labelName(onlyEntity)}`;
    if (selected.length === 0) return '';

    return `Selected: ${selected.length} entities`;
}

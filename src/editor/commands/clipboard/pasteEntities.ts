import { NameComponent } from '../../../core/components/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import type { EntityData, LevelReader, LevelWriter } from '../../../core/level-data/index.ts';
import { PastePlacement, readRootTransform, withRootTransform } from '../../clipboard/index.ts';
import type { EntityFragment, IdRemapping } from '../../clipboard/index.ts';
import { AddEntitiesChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';
import { pasteRefusalText } from './pasteRefusalText.ts';

const LOCKED = 'This group is locked';
const NAME_TYPE_NAME = NameComponent.schema.typeName;

// What a paste reads and writes entities with: the session's.
export type PasteTools = {
    readonly reader: LevelReader;
    readonly writer: LevelWriter;
    readonly remapping: IdRemapping;
};

// Where a paste goes: the point the set is centred on, in level positions, and the grid size it snaps to,
// undefined with grid snapping off.
export type PasteSpot = {
    readonly destination: Point;
    readonly gridSize: number | undefined;
};

// Puts copied entities into the current group, on top, with new ids, each root kept as it looked when
// copied and the set placed by PastePlacement, then selects them, in one step "Paste 3 entities". Refused
// whole, before anything changes, inside a locked group or when the reader refuses the entities.
export function pasteEntities(
    openLevel: OpenLevel,
    tools: PasteTools,
    fragment: EntityFragment,
    spot: PasteSpot,
): EditOutcome {
    const { level, editor, currentGroup, caches } = openLevel;
    const group = currentGroup.group;
    if (caches.hidden.isLocked(group)) return { kind: 'refused', reason: LOCKED };

    const remapped = tools.remapping.remap(fragment, openLevel);
    const check = tools.reader.checkSubtree(level, remapped, group);
    if (!check.ok) return { kind: 'refused', reason: pasteRefusalText(check.refusal) };

    // checkSubtree read every root as an entity.
    const roots = remapped as readonly EntityData[];
    const placement = new PastePlacement(fragment.box, spot.destination, spot.gridSize);
    const worldMatrix = caches.worldMatrices.matrixOf(level.world);
    const groupMatrix = caches.worldMatrices.matrixOf(group);

    const placedRoots = roots.map((root) => {
        const copiedValues = readRootTransform(root);
        const placedValues = placement.placeRoot(copiedValues, worldMatrix, groupMatrix);

        return withRootTransform(root, placedValues, tools.writer);
    });

    const rootIds = placedRoots.map((root) => root.id);
    const place = { parentId: group.id, index: 0 };
    const label = pasteLabel(placedRoots);

    return editor.edit(label, (transaction) => {
        transaction.apply(new AddEntitiesChange({ reader: tools.reader, entities: placedRoots, place }));

        return { kind: 'done', selectAfter: rootIds };
    });
}

// "Paste Crate" for one root, "Paste 3 entities" for more, as stepLabel names entities in the level.
function pasteLabel(roots: readonly EntityData[]) {
    const onlyRoot = roots.length === 1 ? roots[0] : undefined;
    if (onlyRoot === undefined) return `Paste ${roots.length} entities`;

    const name = onlyRoot.components[NAME_TYPE_NAME]?.['name'];
    const shownName = typeof name === 'string' ? name : 'Entity';

    return `Paste ${shownName}`;
}

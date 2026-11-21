import { useMemo, useSyncExternalStore } from 'react';
import type { EntityId } from '../../core/level/index.ts';
import { SelectTool } from '../../editor/tools/index.ts';
import type { ToolController } from '../../editor/tools/index.ts';
import { useEditorTools } from './ToolsContext.ts';

const NONE: readonly number[] = [];

// The indexes of the points the Select tool's point editing has selected, when it edits the one entity
// given; none otherwise. Read through the tool controller, so the Entity inspector needs no copy of its own.
export function useEditedPointIndexes(entityIds: readonly EntityId[]): readonly number[] {
    const { controller } = useEditorTools();
    const subscribe = (listener: () => void) => followTools(controller, listener);
    // A primitive, so React redraws only when the selected points change.
    const read = () => selectedKey(controller, entityIds);
    const key = useSyncExternalStore(subscribe, read);

    return useMemo(() => (key === '' ? NONE : key.split(',').map(Number)), [key]);
}

// The active tool changing, or any tool's preview: point editing redraws its preview as its points change.
function followTools(controller: ToolController, listener: () => void) {
    const unsubscribes = [controller.version, ...controller.tools.map((tool) => tool.preview)].map((counter) =>
        counter.subscribe(listener),
    );

    return () => {
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
    };
}

function selectedKey(controller: ToolController, entityIds: readonly EntityId[]) {
    const active = controller.active;
    if (!(active instanceof SelectTool) || entityIds.length !== 1) return '';

    const edited = active.editedPoints;
    if (edited === undefined || edited.entity.id !== entityIds[0]) return '';

    return edited.selectedIndexes.join(',');
}

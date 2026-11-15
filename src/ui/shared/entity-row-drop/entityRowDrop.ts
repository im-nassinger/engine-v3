import type { EntityId } from '../../../core/level/index.ts';

const DROP_EVENT = 'entity-row-drop';
const DROP_PLACE_SELECTOR = '[data-entity-drop]';

// A row dragged out of the Entities panel and let go over a place that takes an entity, such as an
// entity field. The panel's drag is its own pointer handling, not the browser's drag and drop, so the
// place is found under the pointer and told with a DOM event; neither side imports the other.
export type EntityRowDropEvent = CustomEvent<{ readonly entityId: EntityId }>;

// True when a place under the pointer took the row.
export function dropEntityRowAt(clientX: number, clientY: number, entityId: EntityId) {
    const underPointer = document.elementFromPoint(clientX, clientY);
    const place = underPointer?.closest(DROP_PLACE_SELECTOR);
    if (place === null || place === undefined) return false;

    const event: EntityRowDropEvent = new CustomEvent(DROP_EVENT, { detail: { entityId } });
    place.dispatchEvent(event);

    return true;
}

// Makes the element a place a row can be dropped on. Gives back the function that stops it.
export function takeEntityRowDrops(element: HTMLElement, onDrop: (entityId: EntityId) => void) {
    const handleDrop = (event: Event) => {
        const { detail } = event as EntityRowDropEvent;
        onDrop(detail.entityId);
    };

    element.dataset['entityDrop'] = '';
    element.addEventListener(DROP_EVENT, handleDrop);

    return () => {
        delete element.dataset['entityDrop'];
        element.removeEventListener(DROP_EVENT, handleDrop);
    };
}

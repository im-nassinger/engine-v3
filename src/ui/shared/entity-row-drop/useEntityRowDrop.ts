import { useEffect, useRef } from 'react';
import type { EntityId } from '../../../core/level/index.ts';
import { takeEntityRowDrops } from './entityRowDrop.ts';

// A ref for the element that takes a row dropped from the Entities panel. The latest onDrop is called.
export function useEntityRowDrop<Element extends HTMLElement>(onDrop: (entityId: EntityId) => void) {
    const elementRef = useRef<Element>(null);
    const onDropRef = useRef(onDrop);

    useEffect(() => {
        onDropRef.current = onDrop;
    });

    useEffect(() => {
        const element = elementRef.current;
        if (element === null) return undefined;

        const callLatest = (entityId: EntityId) => onDropRef.current(entityId);

        return takeEntityRowDrops(element, callLatest);
    }, []);

    return elementRef;
}

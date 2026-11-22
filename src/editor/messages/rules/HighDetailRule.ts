import { ShapeComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';

import type { EditorMessage } from '../model/EditorMessage.ts';
import type { EditorMessageRule } from '../model/EditorMessageRule.ts';

// Above this many points a polygon or line gets the tip. The drawing requirement's 200.
const MAX_POINTS_WITHOUT_TIP = 200;

// `High detail may slow physics` under the Points field of a polygon or line over 200 points. Only a tip:
// the shape still draws and collides, up to its 1,000 points.
export class HighDetailRule implements EditorMessageRule {
    check(entity: Entity): readonly EditorMessage[] {
        const shape = entity.getComponent(ShapeComponent);
        if (shape === undefined) return [];

        const geometry = shape.get('geometry');
        const hasPoints = geometry.kind === 'polygon' || geometry.kind === 'line';
        if (!hasPoints || geometry.points.length <= MAX_POINTS_WITHOUT_TIP) return [];

        return [
            {
                kind: 'tip',
                entityId: entity.id,
                componentType: ShapeComponent.schema.typeName,
                fieldKey: 'points',
                itemId: undefined,
                text: 'High detail may slow physics',
                fix: undefined,
            },
        ];
    }
}

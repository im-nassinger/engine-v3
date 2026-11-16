import { TransformComponent } from '../../../core/components/index.ts';
import type { TransformValues } from '../../../core/geometry/index.ts';
import type { EntityData, LevelWriter } from '../../../core/level-data/index.ts';

const TRANSFORM_TYPE_NAME = TransformComponent.schema.typeName;

// A checked root's TransformComponent values. A missing TransformComponent or value reads as its default,
// as the reader reads it.
export function readRootTransform(root: EntityData): TransformValues {
    const transform = new TransformComponent();
    const rawValues = root.components[TRANSFORM_TYPE_NAME] ?? {};

    for (const [fileKey, rawValue] of Object.entries(rawValues)) {
        const entry = transform.schema.findEntryByFileKey(fileKey);
        if (entry === undefined) throw new Error(`The root was checked, yet its transform has ${fileKey}.`);

        const written = transform.writeValue(entry.key, rawValue);
        if (!written.ok) throw new Error(`The root was checked, yet its ${fileKey} is refused.`);
    }

    return {
        position: transform.get('position'),
        rotation: transform.get('rotation'),
        scale: transform.get('scale'),
        skew: transform.get('skew'),
    };
}

// The root with its TransformComponent replaced by these values, everything else as it was.
export function withRootTransform(root: EntityData, values: TransformValues, writer: LevelWriter): EntityData {
    const transform = new TransformComponent(values);
    const written = writer.writeNewEntity(root.id, [transform]);
    const transformData = written.components[TRANSFORM_TYPE_NAME];
    if (transformData === undefined) throw new Error('writeNewEntity writes every component it is given.');

    const components = { ...root.components, [TRANSFORM_TYPE_NAME]: transformData };

    return { ...root, components };
}

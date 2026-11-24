import { isPlainObject } from '../../fields/index.ts';

// Format version 1 to 2 (2026-11-23's simpler triggers): the SurfaceComponent lost its Sensor setting. A
// shape with no SurfaceComponent now lets things pass through, as a sensor did, so a SurfaceComponent with
// Sensor ticked is removed, and Sensor unticked is dropped from the rest. Works on the raw JSON, trusting
// nothing: anything that isn't the shape it expects is left as it is, for the reader to refuse.
export function removeSensorSetting(fileData: unknown): unknown {
    if (!isPlainObject(fileData)) return fileData;

    return { ...fileData, world: entityWithoutSensor(fileData['world']) };
}

// One entity and everything inside it, as level.json and the clipboard hold them. Walked with a list
// rather than by going down, so a file nested thousands deep reaches the reader's depth limit instead of
// running out of stack here.
export function entityWithoutSensor(raw: unknown): unknown {
    if (!isPlainObject(raw)) return raw;

    const top = copiedEntity(raw);
    const pending = [top];

    for (let entity = pending.pop(); entity !== undefined; entity = pending.pop()) {
        const children = entity['children'];
        if (!Array.isArray(children)) continue;

        const copies = children.map((child: unknown) => {
            if (!isPlainObject(child)) return child;

            const copy = copiedEntity(child);
            pending.push(copy);

            return copy;
        });
        entity['children'] = copies;
    }

    return top;
}

// The entity's own keys copied, its components without the Sensor setting; its children are still the
// raw ones until the walk copies them.
function copiedEntity(raw: Readonly<Record<string, unknown>>) {
    const copy: Record<string, unknown> = { ...raw };
    copy['components'] = componentsWithoutSensor(raw['components']);

    return copy;
}

function componentsWithoutSensor(raw: unknown) {
    if (!isPlainObject(raw)) return raw;

    const surface = raw['SurfaceComponent'];
    if (!isPlainObject(surface) || !Object.hasOwn(surface, 'sensor')) return raw;

    const components: Record<string, unknown> = { ...raw };
    if (surface['sensor'] === true) {
        delete components['SurfaceComponent'];
        return components;
    }

    const kept: Record<string, unknown> = { ...surface };
    delete kept['sensor'];
    components['SurfaceComponent'] = kept;

    return components;
}

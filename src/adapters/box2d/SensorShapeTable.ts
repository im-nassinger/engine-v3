import type { b2SensorEvents, b2ShapeId } from 'box2d3-wasm/compat';

import type { EntityId } from '../../core/fields/index.ts';
import type { SensorEvent } from '../../core/physics/index.ts';

type ShapeEntry = {
    readonly surface: EntityId;
    readonly body: EntityId;
    readonly sensor: boolean;
    // Overlaps begun and not yet ended, as the sensor or as the visitor.
    overlaps: number;
    destroyed: boolean;
};

// Box2D's generation is 16 bits, so index and generation make one whole number.
const GENERATIONS = 0x10000;

function keyOf(shapeId: b2ShapeId) {
    return shapeId.index1 * GENERATIONS + shapeId.generation;
}

// Names the entities of a sensor event's two shapes from the whole shape id, index and generation. Box2D
// 3.2 sends a destroyed shape's end with the next step, when the shape can no longer be read and its slot
// may already hold a new shape, so an entry is kept until its last overlap has ended (tech-notes.md).
export class SensorShapeTable {
    private readonly entries = new Map<number, ShapeEntry>();

    add(shapeId: b2ShapeId, surface: EntityId, body: EntityId, sensor: boolean) {
        this.entries.set(keyOf(shapeId), { surface, body, sensor, overlaps: 0, destroyed: false });
    }

    // Drops the entry now if nothing overlaps it, else once its ends have come.
    markDestroyed(shapeId: b2ShapeId) {
        const key = keyOf(shapeId);
        const entry = this.entries.get(key);
        if (entry === undefined) return;

        entry.destroyed = true;
        this.dropIfDone(key, entry);
    }

    // Turns one step's events into SensorEvents, begins first. An event naming a shape the table never had
    // is left out.
    read(sensorEvents: b2SensorEvents, into: SensorEvent[]) {
        for (let i = 0; i < sensorEvents.beginCount; i++) {
            const event = sensorEvents.GetBeginEvent(i);
            this.record('begin', event.sensorShapeId, event.visitorShapeId, into);
        }

        for (let i = 0; i < sensorEvents.endCount; i++) {
            const event = sensorEvents.GetEndEvent(i);
            this.record('end', event.sensorShapeId, event.visitorShapeId, into);
        }
    }

    get size() {
        return this.entries.size;
    }

    clear() {
        this.entries.clear();
    }

    private record(kind: SensorEvent['kind'], sensorId: b2ShapeId, visitorId: b2ShapeId, into: SensorEvent[]) {
        const sensorKey = keyOf(sensorId);
        const visitorKey = keyOf(visitorId);
        const sensor = this.entries.get(sensorKey);
        const visitor = this.entries.get(visitorKey);
        if (sensor === undefined || visitor === undefined) return;

        into.push({
            kind,
            sensor: sensor.surface,
            visitor: visitor.surface,
            visitorBody: visitor.body,
            visitorIsSensor: visitor.sensor,
        });

        const change = kind === 'begin' ? 1 : -1;
        sensor.overlaps += change;
        visitor.overlaps += change;
        this.dropIfDone(sensorKey, sensor);
        this.dropIfDone(visitorKey, visitor);
    }

    private dropIfDone(key: number, entry: ShapeEntry) {
        if (entry.destroyed && entry.overlaps <= 0) {
            this.entries.delete(key);
        }
    }
}

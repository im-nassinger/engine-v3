import type { b2ContactEvents, b2SensorEvents, b2ShapeId } from 'box2d3-wasm/compat';

import type { EntityId } from '../../core/fields/index.ts';
import type { ContactEvent, SensorEvent } from '../../core/physics/index.ts';

type ShapeEntry = {
    readonly surface: EntityId;
    readonly body: EntityId;
    readonly sensor: boolean;
    // Sensor overlaps and contacts begun and not yet ended, on either side.
    open: number;
    destroyed: boolean;
};

// Box2D's generation is 16 bits, so index and generation make one whole number.
const GENERATIONS = 0x10000;

function keyOf(shapeId: b2ShapeId) {
    return shapeId.index1 * GENERATIONS + shapeId.generation;
}

// Names the entities of a sensor or contact event's two shapes from the whole shape id, index and
// generation. Box2D 3.2 sends a destroyed shape's end with the next step, when the shape can no longer be
// read and its slot may already hold a new shape, so an entry is kept until its last overlap or contact has
// ended (tech-notes.md).
export class ShapeTable {
    private readonly entries = new Map<number, ShapeEntry>();

    add(shapeId: b2ShapeId, surface: EntityId, body: EntityId, sensor: boolean) {
        this.entries.set(keyOf(shapeId), { surface, body, sensor, open: 0, destroyed: false });
    }

    // Drops the entry now if nothing is open on it, else once its ends have come.
    markDestroyed(shapeId: b2ShapeId) {
        const key = keyOf(shapeId);
        const entry = this.entries.get(key);
        if (entry === undefined) return;

        entry.destroyed = true;
        this.dropIfDone(key, entry);
    }

    // Turns one step's sensor events into SensorEvents, begins first. An event naming a shape the table
    // never had is left out.
    readSensorEvents(sensorEvents: b2SensorEvents, into: SensorEvent[]) {
        for (let i = 0; i < sensorEvents.beginCount; i++) {
            const event = sensorEvents.GetBeginEvent(i);
            this.recordSensor('begin', event.sensorShapeId, event.visitorShapeId, into);
        }

        for (let i = 0; i < sensorEvents.endCount; i++) {
            const event = sensorEvents.GetEndEvent(i);
            this.recordSensor('end', event.sensorShapeId, event.visitorShapeId, into);
        }
    }

    // Turns one step's contact events into ContactEvents, begins first, as readSensorEvents does.
    readContactEvents(contactEvents: b2ContactEvents, into: ContactEvent[]) {
        for (let i = 0; i < contactEvents.beginCount; i++) {
            const event = contactEvents.GetBeginEvent(i);
            this.recordContact('begin', event.shapeIdA, event.shapeIdB, into);
            event.delete();
        }

        for (let i = 0; i < contactEvents.endCount; i++) {
            const event = contactEvents.GetEndEvent(i);
            this.recordContact('end', event.shapeIdA, event.shapeIdB, into);
        }
    }

    get size() {
        return this.entries.size;
    }

    clear() {
        this.entries.clear();
    }

    private recordSensor(kind: SensorEvent['kind'], sensorId: b2ShapeId, visitorId: b2ShapeId, into: SensorEvent[]) {
        const pair = this.pairOf(kind, sensorId, visitorId);
        if (pair === undefined) return;

        const [sensor, visitor] = pair;
        into.push({
            kind,
            sensor: sensor.surface,
            visitor: visitor.surface,
            visitorBody: visitor.body,
            visitorIsSensor: visitor.sensor,
        });
    }

    private recordContact(kind: ContactEvent['kind'], idA: b2ShapeId, idB: b2ShapeId, into: ContactEvent[]) {
        const pair = this.pairOf(kind, idA, idB);
        if (pair === undefined) return;

        const [a, b] = pair;
        into.push({ kind, surfaceA: a.surface, bodyA: a.body, surfaceB: b.surface, bodyB: b.body });
    }

    // Finds both entries and counts the begin or end on each, dropping a destroyed one whose ends are in.
    private pairOf(kind: 'begin' | 'end', firstId: b2ShapeId, secondId: b2ShapeId) {
        const firstKey = keyOf(firstId);
        const secondKey = keyOf(secondId);
        const first = this.entries.get(firstKey);
        const second = this.entries.get(secondKey);
        if (first === undefined || second === undefined) return undefined;

        const change = kind === 'begin' ? 1 : -1;
        first.open += change;
        second.open += change;
        this.dropIfDone(firstKey, first);
        this.dropIfDone(secondKey, second);

        return [first, second] as const;
    }

    private dropIfDone(key: number, entry: ShapeEntry) {
        if (entry.destroyed && entry.open <= 0) {
            this.entries.delete(key);
        }
    }
}

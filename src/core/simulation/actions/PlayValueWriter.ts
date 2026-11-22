import {
    BodyComponent,
    JointComponent,
    PhysicsWorldComponent,
    SurfaceComponent,
    TagsComponent,
    TransformComponent,
    TriggerComponent,
    VariablesComponent,
} from '../../components/index.ts';
import type { AnyComponent } from '../../components/index.ts';
import { TagsFieldType } from '../../fields/index.ts';
import type { ChangeOp, JsonValue, ValueRef } from '../../fields/index.ts';
import { Matrix2D } from '../../geometry/index.ts';
import type { Point } from '../../geometry/index.ts';
import type { Entity } from '../../level/index.ts';
import { changeableValues, sameValueRef } from '../../triggers/index.ts';

import type { PlayRun } from '../run/PlayRun.ts';
import { entitiesIn } from '../triggers/entitiesIn.ts';

type FieldRef = ValueRef & { readonly kind: 'field' };

// One Change value as the writer is given it: which value, how, and the amount as the trigger stores it.
export type ValueChange = {
    readonly value: ValueRef;
    readonly op: ChangeOp;
    readonly amount: JsonValue;
};

// What a change sets off in the same tick, which TriggerPhase hears in its next round.
export type ValueChangeEffects = {
    tagRanOut(tag: string): void;
    triggerSwitchedOn(owner: Entity, triggerId: number): void;
};

// How physics holds a value: the body's pose, the surface's settings, the World's gravity, a Hinge's motor,
// or fixed, a value physics owns that a running world can't change yet. Every other value is the play
// copy's alone.
type PhysicsRole = 'pose' | 'surface' | 'gravity' | 'motor' | 'fixed' | 'none';

const MOTOR_FIELDS: readonly string[] = ['motor', 'motorSpeed', 'motorStrength', 'resistance'];
const SURFACE_FIELDS: readonly string[] = ['friction', 'restitution', 'sensor'];
const POSE_FIELDS: readonly string[] = ['position', 'rotation'];
const TAGS = new TagsFieldType();

// The one road a value takes when it changes in play: it is written into the play copy through its field
// type, and the physics world is told when it owns the value. A target that doesn't offer the value, or an
// amount its type refuses, is skipped. Gives true when it wrote.
export class PlayValueWriter {
    private readonly run: PlayRun;
    private readonly effects: ValueChangeEffects;
    private readonly tick: number;

    constructor(run: PlayRun, effects: ValueChangeEffects, tick: number) {
        this.run = run;
        this.effects = effects;
        this.tick = tick;
    }

    change(entity: Entity, change: ValueChange) {
        const offers = changeableValues(entity, this.run.registry);
        const offer = offers.find((candidate) => sameValueRef(candidate.ref, change.value));
        if (offer === undefined || !offer.ops.includes(change.op)) return false;

        const amount = offer.amountType.parse(change.amount);
        if (!amount.ok) return false;

        const { value } = change;
        switch (value.kind) {
            case 'variable':
                return this.changeVariable(entity, value.name, change.op, amount.value as number);
            case 'tag':
                return this.changeTag(entity, change.op, amount.value as string);
            case 'triggerOn':
                return this.switchTrigger(entity, value.trigger, amount.value as boolean);
            case 'field':
                return this.changeField(entity, value, change.op, amount.value);
        }
    }

    private changeVariable(entity: Entity, name: string, op: ChangeOp, amount: number) {
        const component = entity.requireComponent(VariablesComponent);
        const variables = component.get('variables').map((variable) => {
            if (variable.name !== name) return variable;
            // A string or boolean variable isn't changed by a number's ops.
            if (typeof variable.value !== 'number') return variable;

            return { ...variable, value: changedNumber(op, variable.value, amount) };
        });
        component.set('variables', variables);
        this.reportChange(entity, component, 'variables');

        return true;
    }

    // Add gives the entity the tag, Subtract takes it away; a tag it already has, or doesn't, changes nothing.
    private changeTag(entity: Entity, op: ChangeOp, typed: string) {
        const tag = TAGS.normalize([typed])[0];
        if (tag === undefined) return false;

        const component = entity.requireComponent(TagsComponent);
        const tags = component.get('tags');
        const has = tags.includes(tag);
        const { counts } = this;

        if (op === 'add') {
            if (has) return true;

            component.set('tags', [...tags, tag]);
            this.reportChange(entity, component, 'tags');
            counts.tagAdded(tag);

            return true;
        }

        if (!has) return true;

        component.set(
            'tags',
            tags.filter((held) => held !== tag),
        );
        this.reportChange(entity, component, 'tags');
        if (counts.tagTakenAway(tag)) {
            this.effects.tagRanOut(tag);
        }

        return true;
    }

    // A timer switched on starts counting from this tick, and one switched off stops.
    private switchTrigger(entity: Entity, triggerId: number, on: boolean) {
        const component = entity.requireComponent(TriggerComponent);
        const triggers = component.get('triggers');
        const trigger = triggers.find((candidate) => candidate.id === triggerId);
        if (trigger === undefined) return false;
        if (trigger.on === on) return true;

        component.set(
            'triggers',
            triggers.map((candidate) => (candidate.id === triggerId ? { ...candidate, on } : candidate)),
        );
        this.reportChange(entity, component, 'triggers');

        const { timers } = this.run.triggers;
        if (!on) {
            timers.switchedOff(entity, triggerId);
            return true;
        }

        timers.switchedOn(entity, triggerId, this.tick);
        this.effects.triggerSwitchedOn(entity, triggerId);

        return true;
    }

    private changeField(entity: Entity, ref: FieldRef, op: ChangeOp, amount: unknown) {
        const component = entity.components.find((held) => held.schema.typeName === ref.component);
        if (component === undefined) return false;

        const role = physicsRoleOf(ref);
        if (role === 'fixed') {
            this.run.warnings.warn({ kind: 'valueFixedInPlay' });
            return false;
        }

        const body = this.run.bodyMatrices.bodyOf(entity);
        if (role === 'pose' && body !== undefined) return this.teleport(entity, ref, op, amount);
        // Physics placed its surfaces, bodies or joints, and only a body can be moved in a running world.
        if (role === 'pose' && holdsPhysics(entity)) return false;

        const next = changedValue(op, component.readValue(ref.field), amount, ref.axis);
        const written = component.writeValue(ref.field, next);
        if (!written.ok) return false;

        this.reportChange(entity, component, ref.field);
        this.tellPhysics(entity, component, role);

        return true;
    }

    private tellPhysics(entity: Entity, component: AnyComponent, role: PhysicsRole) {
        const { world } = this.run.scene;

        if (role === 'surface' && component instanceof SurfaceComponent) {
            world.setSurfaceSettings(entity.id, {
                friction: component.get('friction'),
                restitution: component.get('restitution'),
                sensor: component.get('sensor'),
            });
        }

        if (role === 'gravity' && component instanceof PhysicsWorldComponent) {
            world.setGravity(component.get('gravity'));
        }

        if (role === 'motor' && component instanceof JointComponent) {
            this.changeMotor(entity, component);
        }
    }

    // As jointDefinitionOf builds it: a mirrored Hinge turns the other way.
    private changeMotor(entity: Entity, joint: JointComponent) {
        const playJoint = this.run.joints.find(entity);
        if (playJoint === undefined || playJoint.type !== 'hinge') return;

        const mirrored = this.run.caches.worldMatrices.matrixOf(entity).determinant() < 0;
        const motorSpeed = joint.get('motorSpeed');

        this.run.scene.world.setMotor(playJoint.handle, {
            motor: joint.get('motor'),
            motorSpeed: mirrored ? -motorSpeed : motorSpeed,
            motorStrength: joint.get('motorStrength'),
            resistance: joint.get('resistance'),
        });
    }

    // A body's Position or Rotation is where it is now, measured from its parent, so the play copy is
    // brought up to date first; then the body is moved there, keeping its speed.
    private teleport(entity: Entity, ref: FieldRef, op: ChangeOp, amount: unknown) {
        const { bodyMatrices, caches, poses, scene } = this.run;
        const body = bodyMatrices.bodyOf(entity);
        const levelMatrix = bodyMatrices.matrixOf(entity);
        if (body === undefined || levelMatrix === undefined) return false;

        const transform = entity.requireComponent(TransformComponent);
        const parentMatrix = parentMatrixOf(entity, this.run);
        const fromParent = parentMatrix.invert();
        if (fromParent === undefined) return false;

        const now = fromParent.multiply(levelMatrix).decompose();
        const current = ref.field === 'position' ? now.position : now.rotation;
        const next = changedValue(op, current, amount, ref.axis);
        const nextPosition = ref.field === 'position' ? next : now.position;
        const nextRotation = ref.field === 'rotation' ? next : now.rotation;

        const positionWritten = transform.writeValue('position', nextPosition);
        const rotationWritten = transform.writeValue('rotation', nextRotation);
        if (!positionWritten.ok || !rotationWritten.ok) return false;

        this.reportChange(entity, transform, 'position');
        this.reportChange(entity, transform, 'rotation');

        const newLevel = parentMatrix.multiply(Matrix2D.fromTransform(transformValuesOf(transform)));
        const placed = newLevel.decompose();
        const pose = { x: placed.position.x, y: placed.position.y, angle: placed.rotation };

        scene.world.setPose(body.handle, pose);
        poses.recordMove(entity.id, pose);
        this.run.report.bodyTeleported(entity.id);
        caches.bodyMoved(entity);
        for (const follower of bodyMatrices.followersOf(entity)) {
            caches.bodyMoved(follower);
        }

        return true;
    }

    // The page's mirror writes the same value, so the level view and the Entity inspector show it.
    private reportChange(entity: Entity, component: AnyComponent, key: string) {
        const value = component.readValue(key);

        this.run.report.valueChanged(entity.id, component.schema.typeName, key, value);
    }

    private get counts() {
        return this.run.triggers.tags;
    }
}

function physicsRoleOf(ref: FieldRef): PhysicsRole {
    switch (ref.component) {
        case TransformComponent.schema.typeName:
            return POSE_FIELDS.includes(ref.field) ? 'pose' : 'none';
        case BodyComponent.schema.typeName:
            return 'fixed';
        case SurfaceComponent.schema.typeName:
            return SURFACE_FIELDS.includes(ref.field) ? 'surface' : 'none';
        case PhysicsWorldComponent.schema.typeName:
            return ref.field === 'gravity' ? 'gravity' : 'none';
        case JointComponent.schema.typeName:
            return MOTOR_FIELDS.includes(ref.field) ? 'motor' : 'fixed';
        default:
            return 'none';
    }
}

function holdsPhysics(top: Entity) {
    return entitiesIn(top).some(
        (entity) =>
            entity.hasComponent(SurfaceComponent) ||
            entity.hasComponent(BodyComponent) ||
            entity.hasComponent(JointComponent),
    );
}

function transformValuesOf(transform: TransformComponent) {
    return {
        position: transform.get('position'),
        rotation: transform.get('rotation'),
        scale: transform.get('scale'),
        skew: transform.get('skew'),
    };
}

function parentMatrixOf(entity: Entity, run: PlayRun) {
    const parent = entity.parent;
    if (parent === undefined) return Matrix2D.identity();

    return run.caches.worldMatrices.matrixOf(parent);
}

function changedNumber(op: ChangeOp, current: number, amount: number) {
    switch (op) {
        case 'set':
            return amount;
        case 'add':
            return current + amount;
        case 'subtract':
            return current - amount;
    }
}

// Set takes the amount whole; Add and Subtract change a number, or one axis of a vector.
function changedValue(op: ChangeOp, current: unknown, amount: unknown, axis: 'x' | 'y' | undefined): unknown {
    if (op === 'set') return amount;
    if (axis === undefined) return changedNumber(op, current as number, amount as number);

    const vector = current as Point;
    const changed = changedNumber(op, vector[axis], amount as number);

    return { ...vector, [axis]: changed };
}

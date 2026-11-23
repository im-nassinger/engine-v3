import type { BodyHandle, JointHandle, PhysicsEngine, PhysicsWorld } from '../../../core/physics/index.ts';

// A physics world that keeps nothing, so the PlayMirror can build its scene with the play copy's own code
// and get the same bodies, rests and joints without running physics. Its bodies never move.
class NoPhysicsWorld implements PhysicsWorld {
    private bodyCount = 0;
    private jointCount = 0;

    createBody(): BodyHandle {
        this.bodyCount += 1;

        return this.bodyCount - 1;
    }

    addSurface() {}

    createJoint(): JointHandle {
        this.jointCount += 1;

        return this.jointCount - 1;
    }

    destroyJoint() {}
    setGravity() {}

    step() {
        throw new Error('The PlayMirror runs no physics.');
    }

    readMovedBodies() {}
    readSensorEvents() {}

    contactEvents() {
        return [];
    }

    velocity() {
        return { linear: { x: 0, y: 0 }, spin: 0 };
    }

    setPose() {}
    addVelocity() {}
    setSurfaceSettings() {}
    setMotor() {}
    destroyBody() {}
    removeSurfaces() {}
    destroy() {}
}

export class NoPhysicsEngine implements PhysicsEngine {
    async load() {}

    createWorld(): PhysicsWorld {
        return new NoPhysicsWorld();
    }
}

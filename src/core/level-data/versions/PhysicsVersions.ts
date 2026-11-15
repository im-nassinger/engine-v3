export type PhysicsBuild = {
    readonly physicsVersion: number;
    readonly box2dWasmVersion: string;
    readonly box2dVersion: string;
};

// The Box2D build behind each physics version. A new build, even a fix, adds a row, because the same
// level can move differently on another build. v1 only records the version in level.json.
const BUILDS: readonly PhysicsBuild[] = [{ physicsVersion: 1, box2dWasmVersion: '6.0.0', box2dVersion: '3.2' }];

export class PhysicsVersions {
    static readonly current = 1;

    static buildOf(physicsVersion: number) {
        return BUILDS.find((build) => build.physicsVersion === physicsVersion);
    }

    static all() {
        return [...BUILDS];
    }
}

import Box2DFactory from 'box2d3-wasm/compat';
import type { Box2DModule } from 'box2d3-wasm/compat';

import type { PhysicsEngine, WorldSettings } from '../../core/physics/index.ts';

import { Box2dPhysicsWorld } from './Box2dPhysicsWorld.ts';

// Box2D v3.2 from box2d3-wasm's compat build, the one build that gives the same numbers on every computer.
// The wasm is fetched once, however often load() is called.
export class Box2dPhysicsEngine implements PhysicsEngine {
    private box2d: Box2DModule | undefined;
    private loading: Promise<void> | undefined;

    load() {
        this.loading ??= this.loadBox2d();

        return this.loading;
    }

    createWorld(settings: WorldSettings) {
        if (this.box2d === undefined) {
            throw new Error('Box2D is not loaded yet: wait for load() before creating a world.');
        }

        return new Box2dPhysicsWorld(this.box2d, settings);
    }

    private async loadBox2d() {
        this.box2d = await Box2DFactory();
    }
}

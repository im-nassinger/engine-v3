import { BodyComponent } from '../BodyComponent/BodyComponent.ts';
import { CameraComponent } from '../CameraComponent/CameraComponent.ts';
import { ComponentRegistry } from './ComponentRegistry.ts';
import { JointComponent } from '../JointComponent/JointComponent.ts';
import { NameComponent } from '../NameComponent/NameComponent.ts';
import { PathComponent } from '../PathComponent/PathComponent.ts';
import { PhysicsWorldComponent } from '../PhysicsWorldComponent/PhysicsWorldComponent.ts';
import { ShapeComponent } from '../ShapeComponent/ShapeComponent.ts';
import { StyleComponent } from '../StyleComponent/StyleComponent.ts';
import { SurfaceComponent } from '../SurfaceComponent/SurfaceComponent.ts';
import { TagsComponent } from '../TagsComponent/TagsComponent.ts';
import { TransformComponent } from '../TransformComponent/TransformComponent.ts';

// The order here fixes each component's index for Lua: new components are only ever added at the end.
export function createV1Registry() {
    const registry = new ComponentRegistry();

    registry.register(TransformComponent);
    registry.register(NameComponent);
    registry.register(ShapeComponent);
    registry.register(PathComponent);
    registry.register(StyleComponent);
    registry.register(BodyComponent);
    registry.register(SurfaceComponent);
    registry.register(JointComponent);
    registry.register(CameraComponent);
    registry.register(PhysicsWorldComponent);
    // v3's, in their card order. Card 14 is kept for v5's ScriptComponent.
    registry.register(TagsComponent);

    return registry;
}

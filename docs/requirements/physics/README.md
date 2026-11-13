# Physics

## TL;DR

How entities move, collide and connect. **In v1** you add a body in one click, set Box2D's body and surface settings, merge shapes in a group into one body, see physics with the physics view, set gravity and level bounds on the World, and connect bodies with three joints: Hinge, Rope and Spring. **In v2** come one-way platforms, the collision grid with its Collision check, gravity buttons, game speed, four more joints, breaking joints, and warnings for bad setups. Core rules: touching is detected by the physics engine alone, the collision grid is the one place that decides what hits what, and a joint is an ordinary entity.

## Files

| File | Covers |
|---|---|
| [bodies.md](bodies.md) | BodyComponent, SurfaceComponent, sensors, one-way, merging, scale, the physics view, physics warnings |
| [world.md](world.md) | Gravity, background, game speed, the collision grid, the Collision check, level bounds |
| [joints.md](joints.md) | The joint types, the Joint tool, settings, drawing, breaking, moving and copying, joint warnings |

## Features and versions

| Feature | Version | File |
|---|---|---|
| Add a body in one click | v1 | bodies |
| Body settings | v1 | bodies |
| The SurfaceComponent, sensors | v1 | bodies |
| Shapes in a group merge into one body | v1 | bodies |
| The physics view | v1 | bodies |
| Gravity and background colour | v1 | world |
| Level bounds | v1 | world |
| Hinge, Rope, Spring and the Joint tool | v1 | joints |
| Typed joint settings | v1 | joints |
| Rope and Spring show in play | v1 | joints |
| One-way platforms | v2 | bodies |
| Warnings for physics and joints | v2 | bodies, joints |
| The collision grid, the Collision check | v2 | world |
| Gravity buttons, game speed, background image | v2 | world |
| Weld, Rod, Slider, Wheel | v2 | joints |
| Drag limits, re-attach an end, change type | v2 | joints |
| Joints that break | v2 | joints |

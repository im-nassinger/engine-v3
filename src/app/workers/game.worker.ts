import { Box2dPhysicsEngine } from '../../adapters/box2d/index.ts';
import { GameWorkerHost } from '../../adapters/worker/index.ts';

// The game worker's composition root: GameWorkerHost with Box2D, answering the page.
new GameWorkerHost(self, new Box2dPhysicsEngine()).listen();

import { FillGradient } from 'pixi.js';
import type { GradientFill } from '../../core/fields/index.ts';

type Held = {
    readonly gradient: FillGradient;
    count: number;
};

// A gradient's kind and stops: all its texture depends on, since PixiFill places it on each entity's box.
function keyOf(fill: GradientFill) {
    const stops = fill.stops.map((stop) => `${stop.colour}@${stop.place}`);

    return `${fill.kind}:${stops.join(',')}`;
}

// Made once in a unit space PixiFill maps onto each box: a linear gradient from 0 to 1 along x, a radial
// one in the unit square, centred, touching its sides. Its own matrix is never used.
function makeGradient(fill: GradientFill) {
    const colorStops = fill.stops.map((stop) => ({ offset: stop.place, color: stop.colour }));
    const gradient =
        fill.kind === 'linear'
            ? new FillGradient({ type: 'linear', start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops })
            : new FillGradient({
                  type: 'radial',
                  center: { x: 0.5, y: 0.5 },
                  innerRadius: 0,
                  outerRadius: 0.5,
                  colorStops,
              });
    gradient.textureSpace = 'global';
    // Built now, so PixiJS never builds it again over the matrix PixiFill gives it.
    gradient.buildGradient();

    return gradient;
}

// Repaints a spare gradient's texture with another gradient's stops, in place. PixiJS caches every set of
// textures a Graphics drew and never clears it, so destroying a drawn texture warns
// "[BindGroup] … destroyed while still bound"; reusing it never does.
function repaint(spare: FillGradient, fill: GradientFill) {
    const fresh = makeGradient(fill);
    const canvas = spare.texture.source.resource as HTMLCanvasElement;
    const context = canvas.getContext('2d');
    if (context === null) return fresh;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(fresh.texture.source.resource as HTMLCanvasElement, 0, 0);
    spare.texture.source.update();
    spare.colorStops = fresh.colorStops;
    // Never drawn, so no Graphics holds it and destroying it is quiet.
    fresh.destroy();

    return spare;
}

// One FillGradient, and so one texture, for every entity whose gradient has the same kind and stops,
// counted. When the last one lets go, the gradient becomes a spare of its kind, repainted for the next
// new gradient instead of destroyed (see repaint). Without sharing, 10,000 copied platforms with one
// gradient would hold 10,000 textures; the spares are never more than the most gradients shown at once.
export class GradientTextures {
    private readonly held = new Map<string, Held>();
    private readonly spares: Record<GradientFill['kind'], FillGradient[]> = { linear: [], radial: [] };

    // How many textures are held, for tests.
    get count() {
        return this.held.size;
    }

    // Each hold is matched by one letGo with the key it gave.
    hold(fill: GradientFill) {
        const key = keyOf(fill);
        let held = this.held.get(key);
        if (held === undefined) {
            const spare = this.spares[fill.kind].pop();
            const gradient = spare === undefined ? makeGradient(fill) : repaint(spare, fill);
            held = { gradient, count: 0 };
            this.held.set(key, held);
        }
        held.count += 1;

        return { key, gradient: held.gradient };
    }

    letGo(key: string) {
        const held = this.held.get(key);
        if (held === undefined) return;

        held.count -= 1;
        if (held.count > 0) return;

        this.held.delete(key);
        this.spares[held.gradient.type].push(held.gradient);
    }

    dispose() {
        for (const held of this.held.values()) {
            held.gradient.destroy();
        }
        this.held.clear();
        for (const gradient of [...this.spares.linear, ...this.spares.radial]) {
            gradient.destroy();
        }
        this.spares.linear = [];
        this.spares.radial = [];
    }
}

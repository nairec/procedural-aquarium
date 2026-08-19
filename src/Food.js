import { toroidalDist } from './utils.js';

function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default class Food {
    constructor(origin, options = {}) {
        this.position = origin;
        this.id = options.id ?? crypto.randomUUID();
        this.energy = options.energy ?? 25;
        this.radius = options.radius ?? 4;
        this.alive = true;
        this.ttl = options.ttl ?? null;
        this.spawnDuration = options.spawnDuration ?? 0.7;
        this.spawnAge = 0;
    }

    distanceTo(position, bounds) {
        return toroidalDist(this.position, position, bounds);
    }

    consume() {
        this.alive = false;
        return this.energy;
    }

    getSpawnScale() {
        if (this.spawnAge >= this.spawnDuration) return 1;
        return easeInOut(this.spawnAge / this.spawnDuration);
    }

    update(dt) {
        if (this.spawnAge < this.spawnDuration) {
            this.spawnAge = Math.min(this.spawnDuration, this.spawnAge + dt);
        }

        if (this.ttl) {
            this.ttl -= dt;
            if (this.ttl <= 0) {
                this.alive = false;
            }
        }
    }

    draw(ctx) {
        const scale = this.getSpawnScale();
        if (scale <= 0) return;

        ctx.fillStyle = '#fb542b';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * scale, 0, 2 * Math.PI);
        ctx.fill();
    }
}
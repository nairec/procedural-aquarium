import Chain from './Chain.js';
import { vec, relativeAngleDiff, dist, setMag, sub, add, drawWrapped, toroidalDelta, toroidalDist } from './utils.js';

function drawCurvePath(ctx, points, closed = false) {
    if (points.length < 2) return;

    if (points.length < 4) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        if (closed) ctx.closePath();
        return;
    }

    const extended = [
        points[0],
        ...points,
        points[points.length - 1],
    ];

    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < extended.length - 2; i++) {
        const p0 = extended[i - 1];
        const p1 = extended[i];
        const p2 = extended[i + 1];
        const p3 = extended[i + 2];

        ctx.bezierCurveTo(
            p1.x + (p2.x - p0.x) / 6,
            p1.y + (p2.y - p0.y) / 6,
            p2.x - (p3.x - p1.x) / 6,
            p2.y - (p3.y - p1.y) / 6,
            p2.x,
            p2.y,
        );
    }

    if (closed) ctx.closePath();
}

export const FISH_BODY_WIDTH = [7, 8, 8, 7.5, 7, 6, 5, 4, 2, 1];
export const FISH_LINK_SIZE = 6;

const FIN_PECTORAL = { width: 22, height: 8 };
const FIN_SIDE = { width: 16, height: 6 };
const EYE_OFFSET = -4;
const EYE_RADIUS = 2;
const STROKE_WIDTH = 0.5;
const DORSAL_BULGE = 4;

export default class Fish {
    constructor(origin, colors, behavior, world, role, options = {}) {
        this.origin = origin;
        this.bodyColor = colors.body;
        this.finColor = colors.fin;
        this.linkSize = FISH_LINK_SIZE;
        this.metabolism = options.metabolism ?? 5;
        this.bodyWidth = FISH_BODY_WIDTH;
        this.spine = new Chain(origin, this.bodyWidth.length, this.linkSize, Math.PI / 4, behavior);
        this.alive = true;
        this.energy = 80;
        this.role = role;
        this.behavior = behavior;
        this.world = world;
        this.lastPickTime = 0;
        this.state = 'wander'; // wander / flee
        this.lastReproductionTime = 0;
    }

    eat(energy) {
        this.energy += energy;
        if (this.energy > 100) {
            this.energy = 100;
        }
    }

    update(now, dt) {
        let speed = this.behavior.speed * this.getEnergySpeedMultiplier();
        if (this.state === 'flee') {
            this.spine.setSpeed(speed * this.behavior.fleeSpeedMultiplier ?? 1.2);
        }
        if (this.state === 'wander') {
            this.spine.setSpeed(speed);
        }

        const target = this.pickTarget();
        if (target) {
            this.spine.setTarget(target);
        }
        this.spine.update(dt, this.world.bounds);

        if (this.state === 'flee') {
            this.energy -= this.metabolism * dt * 1.2;
        } else {
            this.energy -= this.metabolism * dt;
        }

        if (this.energy <= 0) {
            this.alive = false;
        }
        
        this.resolveReproduction(now, dt);
        this.spine.wrapAllJoints(this.world.bounds);

    }

    pickTarget() {
        if (this.role === 'prey') {
            const threat = this.detectThreat();
            if (threat) {
                this.state = 'flee';
                return this.computeFleeTarget(threat);
            }

            const nearestFood = this.world.getNearestFood(
                this.getHeadPos(),
                this.behavior.wanderRadius,
            );
            if (nearestFood) {
                this.state = 'wander';
                return vec(nearestFood.position.x, nearestFood.position.y);
            }

            this.state = 'wander';
            return this.pickWanderTarget();
        }

        if (this.role === 'predator') {
            const nearestPrey = this.world.getNearestPrey(
                this.getHeadPos(),
                this.behavior.wanderRadius,
            );
            if (nearestPrey?.alive) {
                const head = nearestPrey.getHeadPos();
                return vec(head.x, head.y);
            }

            return this.pickWanderTarget();
        }

        return null;
    }

    pickWanderTarget() {
        const now = performance.now();
        if (now - this.lastPickTime < this.behavior.pickInterval) {
            return null;
        }

        this.lastPickTime = now;
        return vec(
            Math.random() * this.world.bounds.width,
            Math.random() * this.world.bounds.height,
        );
    }

    resolveReproduction(now, dt) {
        if (now - this.lastReproductionTime >= this.behavior.reproductionCooldown) {
            if (this.role === 'prey') {
                if (this.energy > 85) {
                    this.energy -= 60;
                    const newFish = new Fish(
                        vec(this.getHeadPos().x, this.getHeadPos().y), 
                        { body: this.bodyColor, fin: this.finColor }, 
                        this.behavior, 
                        this.world, 
                        this.role, 
                        { metabolism: this.metabolism }
                    );
                    this.world.addPrey(newFish);
                    this.lastReproductionTime = now;
                }
            }
            if (this.role === 'predator') {
                if (this.energy > 90) {
                    this.energy -= 70;
                    const newFish = new Fish(
                        vec(this.getHeadPos().x, this.getHeadPos().y), 
                        { body: this.bodyColor, fin: this.finColor }, 
                        this.behavior, 
                        this.world, 
                        this.role, 
                        { metabolism: this.metabolism }
                    );
                    this.world.addPredator(newFish);
                    this.lastReproductionTime = now;
                }
            }
        }
    }

    detectThreat() {
        const nearestPredator = this.world.getNearestPredator(this.getHeadPos(), this.behavior.fleeRadius);
        if (nearestPredator && nearestPredator.alive) {
            return nearestPredator.getHeadPos();
        }
        return null;
    }

    computeFleeTarget(predatorPos) {
        const away = toroidalDelta(predatorPos, this.getHeadPos(), this.world.bounds);
        const direction = setMag(away, this.behavior.fleeDistance);
        const target = add(this.getHeadPos(), direction);
        return target;
    }

    getPosX(i, angleOffset, lengthOffset = 0) {
        const joint = this.spine.joints[i];
        const angle = this.spine.angles[i];
        return joint.x + Math.cos(angle + angleOffset) * (this.bodyWidth[i] + lengthOffset);
    }

    getPosY(i, angleOffset, lengthOffset = 0) {
        const joint = this.spine.joints[i];
        const angle = this.spine.angles[i];
        return joint.y + Math.sin(angle + angleOffset) * (this.bodyWidth[i] + lengthOffset);
    }

    pushHeadArc(bodyPoints, steps = 7) {
        const j0 = this.spine.joints[0];
        const a0 = this.spine.angles[0];
        const headR = this.getHeadRadius();
        for (let k = 1; k < steps; k++) {
            const offset = -Math.PI / 2 + (Math.PI * k) / steps;
            bodyPoints.push(vec(
                j0.x + Math.cos(a0 + offset) * headR,
                j0.y + Math.sin(a0 + offset) * headR,
            ));
        }
    }

    getHeadRadius() {
        return this.bodyWidth[0];
    }

    getFlankPoint(i, top) {
        const offset = top ? Math.PI / 2 : -Math.PI / 2;
        if (i === 0) {
            const j0 = this.spine.joints[0];
            const a0 = this.spine.angles[0];
            const r = this.getHeadRadius();
            return vec(
                j0.x + Math.cos(a0 + offset) * r,
                j0.y + Math.sin(a0 + offset) * r,
            );
        }
        return vec(this.getPosX(i, offset, 0), this.getPosY(i, offset, 0));
    }

    getHeadPos() {
        return this.spine.joints[0];
    }

    distanceTo(position) {
        return toroidalDist(this.getHeadPos(), position, this.world.bounds);
    }

    drawFinEllipse(ctx, jointIndex, sideAngle, rotation, width, height) {
        ctx.save();
        ctx.translate(this.getPosX(jointIndex, sideAngle, 0), this.getPosY(jointIndex, sideAngle, 0));
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    getWrapMargin() {
        const maxBodyWidth = Math.max(...this.bodyWidth);
        return this.linkSize * this.spine.jointCount + maxBodyWidth;
    }

    getEnergySpeedMultiplier() {
        const min = this.behavior.minEnergySpeed ?? 0.4;
        const t = Math.max(0, Math.min(1, this.energy / 100));
        return min + (1 - min) * t;
      }

    draw(ctx) {
        drawWrapped(
            ctx,
            this.world.bounds,
            this.getHeadPos(),
            this.getWrapMargin(),
            () => this.drawBody(ctx),
        );
    }

    drawBody(ctx) {
        const j = this.spine.joints;
        const a = this.spine.angles;
        const n = j.length;

        const mid1 = Math.min(6, n - 1);
        const mid2 = Math.min(7, n - 1);
        const bodyEnd = Math.min(9, n - 1);

        const headToMid1 = relativeAngleDiff(a[0], a[mid1]);
        const headToMid2 = relativeAngleDiff(a[0], a[mid2]);
        const dorsal1 = Math.min(1, Math.abs(headToMid1));
        const dorsal2 = Math.min(1, Math.abs(headToMid2));

        ctx.lineWidth = STROKE_WIDTH;
        ctx.strokeStyle = 'white';
        ctx.fillStyle = this.finColor;

        if (n > 3) {
            this.drawFinEllipse(ctx, 3, Math.PI / 3, a[2] - Math.PI / 4, FIN_PECTORAL.width, FIN_PECTORAL.height);
            this.drawFinEllipse(ctx, 3, -Math.PI / 3, a[2] + Math.PI / 4, FIN_PECTORAL.width, FIN_PECTORAL.height);
        }

        if (n > 7) {
            this.drawFinEllipse(ctx, 7, Math.PI / 2, a[6] - Math.PI / 4, FIN_SIDE.width, FIN_SIDE.height);
            this.drawFinEllipse(ctx, 7, -Math.PI / 2, a[6] + Math.PI / 4, FIN_SIDE.width, FIN_SIDE.height);
        }

        ctx.fillStyle = this.bodyColor;

        const bodyPoints = [];

        for (let i = 0; i <= bodyEnd; i++) {
            bodyPoints.push(this.getFlankPoint(i, true));
        }

        bodyPoints.push(vec(this.getPosX(bodyEnd, Math.PI, 0), this.getPosY(bodyEnd, Math.PI, 0)));

        for (let i = bodyEnd; i >= 0; i--) {
            bodyPoints.push(this.getFlankPoint(i, false));
        }

        this.pushHeadArc(bodyPoints);

        ctx.beginPath();
        drawCurvePath(ctx, bodyPoints, true);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.finColor;

        if (n > 7) {
            ctx.beginPath();
            ctx.moveTo(j[4].x, j[4].y);
            ctx.bezierCurveTo(j[5].x, j[5].y, j[6].x, j[6].y, j[7].x, j[7].y);
            ctx.bezierCurveTo(
                j[6].x + Math.cos(a[6] + Math.PI / 2) * dorsal2 * DORSAL_BULGE,
                j[6].y + Math.sin(a[6] + Math.PI / 2) * dorsal2 * DORSAL_BULGE,
                j[5].x + Math.cos(a[5] + Math.PI / 2) * dorsal1 * DORSAL_BULGE,
                j[5].y + Math.sin(a[5] + Math.PI / 2) * dorsal1 * DORSAL_BULGE,
                j[4].x,
                j[4].y,
            );
            ctx.fill();
            ctx.stroke();
        }

        if (this.role === 'predator') {
            ctx.fillStyle = '#b47773';
        } else {
            ctx.fillStyle = 'white';
        }
        ctx.beginPath();
        ctx.ellipse(this.getPosX(0, Math.PI / 2, EYE_OFFSET), this.getPosY(0, Math.PI / 2, EYE_OFFSET), EYE_RADIUS, EYE_RADIUS, 0, 0, 2 * Math.PI);
        ctx.ellipse(this.getPosX(0, -Math.PI / 2, EYE_OFFSET), this.getPosY(0, -Math.PI / 2, EYE_OFFSET), EYE_RADIUS, EYE_RADIUS, 0, 0, 2 * Math.PI);
        ctx.fill();
    }
}
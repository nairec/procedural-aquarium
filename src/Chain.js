import { heading, add, sub, setMag, fromAngle, vec, constraintAngle, rotateToward, wrapPos, toroidalDelta } from "./utils.js";



export default class Chain {
    constructor(origin, jointCount, linkSize, angleConstraint, behavior) {

        this.jointCount = jointCount;
        this.linkSize = linkSize;
        this.angleConstraint = angleConstraint;
        this.joints = [];
        this.angles = [];
        this.joints.push(vec(origin.x, origin.y));
        this.angles.push(-Math.PI / 2);

        for (let i = 1; i < jointCount; i++) {
            this.joints.push(add(this.joints[i - 1], vec(0, this.linkSize)));
            this.angles.push(0);
        }

        this.target = vec(origin.x, origin.y);
        this.speed = behavior.speed ?? 120;
        this.turnRate = behavior.turnRate ?? Math.PI;

    }

    setTarget(position) {
        this.target.x = position.x;
        this.target.y = position.y;
    }

    update(dt, bounds) {
        this.moveHead(dt, bounds);
        this.resolve(this.joints[0]);
    }

    moveHead(dt, bounds) {

        const head = this.joints[0];
        const dx = this.target.x - head.x;
        const dy = this.target.y - head.y;
        const d = Math.hypot(dx, dy);
        if (d == 0) return;

        const delta = toroidalDelta(head, this.target, bounds);
        const desired = heading(delta);
        const maxTurn = this.turnRate * dt;
        this.angles[0] = rotateToward(this.angles[0], desired, maxTurn);

        const dir = fromAngle(this.angles[0]);
        const step = this.speed * dt;

        head.x += dir.x * step;
        head.y += dir.y * step;
    }

    resolve(position) {

        this.joints[0].x = position.x;
        this.joints[0].y = position.y;

        for (let i = 1; i < this.jointCount; i++) {
            let curAngle = heading(sub(this.joints[i - 1], this.joints[i]));
            this.angles[i] = constraintAngle(curAngle, this.angles[i - 1], this.angleConstraint);
            this.joints[i] = sub(this.joints[i - 1], setMag(fromAngle(this.angles[i]), this.linkSize));
        }
    }

    wrapAllJoints(bounds) {
        for (let i = 0; i < this.jointCount; i++) {
            this.joints[i] = wrapPos(this.joints[i], bounds);
        }

        for (let i = 1; i < this.jointCount; i++) {
            while (this.joints[i].x - this.joints[i - 1].x > bounds.width/2) this.joints[i].x -= bounds.width;
            while (this.joints[i].x - this.joints[i - 1].x < -bounds.width/2) this.joints[i].x += bounds.width;
            while (this.joints[i].y - this.joints[i - 1].y > bounds.height/2) this.joints[i].y -= bounds.height;
            while (this.joints[i].y - this.joints[i - 1].y < -bounds.height/2) this.joints[i].y += bounds.height;
        }
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    draw(ctx) {

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.beginPath();

        for (let i = 0; i < this.jointCount - 1; i++) {
            const a = this.joints[i];
            const b = this.joints[i + 1];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }

        ctx.stroke();

        for (let i = 0; i < this.jointCount - 1; i++) {
            const a = this.joints[i];
            ctx.beginPath();
            ctx.arc(a.x, a.y, this.linkSize / 2, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

}



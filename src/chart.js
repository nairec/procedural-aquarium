const DEFAULT_SERIES = [
    { key: 'prey', color: 'hsl(210, 70%, 55%)', label: 'Prey' },
    { key: 'predators', color: 'hsl(340, 70%, 55%)', label: 'Predators' },
    { key: 'food', color: 'hsl(25, 80%, 55%)', label: 'Food' },
];

export default class PopulationChart {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.history = [];
        this.maxPoints = options.maxPoints ?? 120;
        this.sampleInterval = options.sampleInterval ?? 0.5;
        this.sampleTimer = 0;
        this.series = options.series ?? DEFAULT_SERIES;
    }

    sample(world) {
        this.history.push({
            prey: world.prey.length,
            predators: world.predators.length,
            food: world.food.length,
        });
        if (this.history.length > this.maxPoints) {
            this.history.shift();
        }
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const pad = { top: 8, right: 8, bottom: 14, left: 28 };
        const plotW = w - pad.left - pad.right;
        const plotH = h - pad.top - pad.bottom;

        this.ctx.clearRect(0, 0, w, h);
        if (this.history.length < 2) return;

        let maxY = 1;
        for (const point of this.history) {
            maxY = Math.max(maxY, point.prey, point.predators, point.food);
        }
        maxY = Math.ceil(maxY * 1.1);

        const xOffset = this.maxPoints - this.history.length;
        const xAt = (i) => pad.left + ((xOffset + i) / (this.maxPoints - 1)) * plotW;
        const yAt = (v) => pad.top + plotH - (v / maxY) * plotH;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= 3; i++) {
            const y = pad.top + (plotH * i) / 3;
            this.ctx.beginPath();
            this.ctx.moveTo(pad.left, y);
            this.ctx.lineTo(w - pad.right, y);
            this.ctx.stroke();
        }

        for (const series of this.series) {
            this.ctx.strokeStyle = series.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.history.forEach((point, i) => {
                const x = xAt(i);
                const y = yAt(point[series.key]);
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            });
            this.ctx.stroke();
        }

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '9px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(maxY, pad.left - 4, pad.top + 4);

        let lx = pad.left;
        this.ctx.font = '8px sans-serif';
        this.ctx.textAlign = 'left';
        for (const series of this.series) {
            this.ctx.fillStyle = series.color;
            this.ctx.fillRect(lx, h - 10, 6, 6);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fillText(series.label, lx + 8, h - 4);
            lx += 52;
        }
    }

    tick(dt, world) {
        this.sampleTimer += dt;
        if (this.sampleTimer >= this.sampleInterval) {
            this.sampleTimer = 0;
            this.sample(world);
            this.draw();
        }
    }
}

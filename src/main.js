import './style.css'
import { vec, randomFishColors } from './utils.js';
import Fish from './Fish.js';
import World from './World.js';
import PopulationChart from './chart.js';
import { initShaderBackground } from './waves-shader.js';

initShaderBackground(document.getElementById('shader-bg'));

const canvas = document.getElementById('canvas');

var window_height = window.innerHeight;
var window_width = window.innerWidth;


const radius = 20

const ctx = canvas.getContext('2d');

const predatorBehavior = {
    speed: 143,
    wanderRadius: 500,
    pickInterval: 2000,
    turnRate: Math.PI / 1.5,
    reproductionCooldown: 12000,
};

const preyBehavior = {
    speed: 120,
    wanderRadius: 200,
    pickInterval: 2000,
    turnRate: Math.PI / 2,
    fleeRadius: 100,
    fleeDistance: 150,
    fleeSpeedMultiplier: 1.15,
    reproductionCooldown: 10000,
}

const config = {
    foodMax: 80,
    foodMin: 10,
    foodSpawnRate: 1.5,
    foodEnergy: 45,
    preyMax: 60,
    preyMin: 5,
    predatorMax: 8,
    eatRadius: 12,
}

const preyCount = 25;
const predatorCount = 5;
const world = new World({ width: window_width, height: window_height }, config);

function resize() {
    window_width = window.innerWidth;
    window_height = window.innerHeight;
    canvas.width = window_width;
    canvas.height = window_height;
    world.bounds.width = window_width;
    world.bounds.height = window_height;
}
resize();

for (let i = 0; i < preyCount; i++) {
    const fish = new Fish(
        world.randomPosition(),
        randomFishColors('prey'),
        preyBehavior,
        world,
        'prey',
        { metabolism: 3 },
    );
    world.addPrey(fish);
}

for (let i = 0; i < predatorCount; i++) {
    const fish = new Fish(
        world.randomPosition(),
        randomFishColors('predator'),
        predatorBehavior,
        world,
        'predator',
        { metabolism: 3.5 },
    );
    world.addPredator(fish);
}

window.addEventListener('resize', resize);

const populationChart = new PopulationChart(document.getElementById('chart'));
populationChart.sample(world);
populationChart.draw();

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    world.addFood({x, y});
});

let lastTime = performance.now();
function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    world.update(now, dt);
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    world.draw(ctx);
    populationChart.tick(dt, world);
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);


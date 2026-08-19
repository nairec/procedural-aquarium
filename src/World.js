import Food from './Food.js';
import { vec } from './utils.js';

export default class World {
    constructor(bounds, config = {}) {
        this.bounds = bounds;
        this.food = [];
        this.prey = [];
        this.predators = [];
        
        this.config = {
            foodMax: config.foodMax ?? 80,
            foodMin: config.foodMin ?? 10,
            foodSpawnRate: config.foodSpawnRate ?? 1.5,
            foodEnergy: config.foodEnergy ?? 25,
            preyMax: config.preyMax ?? 60,
            preyMin: config.preyMin ?? 5,
            predatorMax: config.predatorMax ?? 8,
            eatRadius: config.eatRadius ?? 12,
        }

        this.stats = { prey: 0, predators: 0, food: 0 }
        this.spawnAccumulator = 0;
    }

    update(now, dt) {
        this.spawnFood(dt);
        this.updateFood(dt);
        this.updatePrey(now, dt);
        this.updatePredators(now, dt);
        this.resolveFeeding();
        this.resolvePredation();
    }

    draw(ctx) {
        this.food.forEach(food => food.draw(ctx));
        this.prey.forEach(prey => prey.draw(ctx));
        this.predators.forEach(predator => predator.draw(ctx));
    }

    spawnFood(dt) {
        this.spawnAccumulator += this.config.foodSpawnRate * dt
        while (this.spawnAccumulator >= 1 && this.food.length < this.config.foodMax) {
          this.addFood(this.randomPosition())
          this.spawnAccumulator -= 1
        }
    }

    ensureFoodMinimum() {
        while (this.food.length < this.config.foodMin) {
            this.addFood(this.randomPosition());
        }
    }
      
    addFood(position) {
        this.food.push(new Food(position, { energy: this.config.foodEnergy }))
    }
      
    removeFood(food) {
        this.food = this.food.filter(f => f !== food)
    }

    getNearestFood(from, radius) {
        return this.getFoodInRadius(from, radius).sort((a, b) => a.distanceTo(from, this.bounds) - b.distanceTo(from, this.bounds))[0];
    }

    getNearestPrey(from, radius) {
        return this.getPreyInRadius(from, radius).sort((a, b) => a.distanceTo(from) - b.distanceTo(from))[0];
    }

    getFoodInRadius(from, radius) {
        return this.food.filter(f => f.distanceTo(from, this.bounds) <= radius);
    }

    getPreyInRadius(from, radius) {
        return this.prey.filter(p => p.distanceTo(from) <= radius);
    }

    getNearestPredator(from, radius) {
        return this.getPredatorsInRadius(from, radius)
            .filter(p => p.alive)
            .sort((a, b) => a.distanceTo(from) - b.distanceTo(from))[0];
    }

    getPredatorsInRadius(from, radius) {
        return this.predators.filter(p => p.distanceTo(from) <= radius);
    }

    resolveFeeding() {
        for (const prey of this.prey) {
            if (!prey.alive) continue;
            const nearestFood = this.getNearestFood(prey.getHeadPos(), this.config.eatRadius);
            if (nearestFood && prey.distanceTo(nearestFood.position) <= this.config.eatRadius) {
                prey.eat(nearestFood.consume());
                this.removeFood(nearestFood);
            }
        }
    }

    resolvePredation() {
        for (const predator of this.predators) {
            if (!predator.alive) continue;
            const nearestPrey = this.getNearestPrey(predator.getHeadPos(), this.config.eatRadius);
            if (nearestPrey && nearestPrey.alive && predator.distanceTo(nearestPrey.getHeadPos()) <= this.config.eatRadius) {
                nearestPrey.alive = false;
                predator.eat(this.config.preyEnergy ?? 60);
            }
        }
    }
      
    randomPosition() {
        return vec(
          Math.random() * this.bounds.width,
          Math.random() * this.bounds.height,
        )
    }

    addPrey(fish) {
        this.prey.push(fish);
    }

    addPredator(fish) {
        this.predators.push(fish);
    }

    updateFood(dt) {
        for (const food of this.food) {
            food.update(dt);
        }
        this.food = this.food.filter(f => f.alive);
    }

    updatePrey(now, dt) {
        for (const prey of this.prey) {
            prey.update(now, dt);
        }
        this.prey = this.prey.filter(p => p.alive);
    }

    updatePredators(now, dt) {
        for (const predator of this.predators) {
            predator.update(now, dt);
        }
        this.predators = this.predators.filter(p => p.alive);
    }
}
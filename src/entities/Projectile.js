import * as THREE from "three";
import { Body, Sphere, Vec3 } from "cannon-es";
import { MeshCache } from "../utils/MeshCache.js";

export class Projectile {
  constructor(scene, world, position, direction, owner, config = {}) {
    this.scene = scene;
    this.world = world;
    this.owner = owner; // 'player' or 'enemy'

    this.speed = Number.isFinite(config.speed) ? config.speed : 34;
    this.damage = Number.isFinite(config.damage) ? config.damage : 120;
    this.directDamage = Number.isFinite(config.directDamage)
      ? config.directDamage
      : this.damage * 0.9;
    this.splashDamage = Number.isFinite(config.splashDamage)
      ? config.splashDamage
      : this.damage;
    this.radius = Number.isFinite(config.radius) ? config.radius : 8; // Explosion radius
    this.headshotMultiplier = Number.isFinite(config.headshotMultiplier)
      ? config.headshotMultiplier
      : 1.75;
    this.isDead = false;
    this.impactEnemy = null;
    this.impactHeadshot = false;
    this.impactPoint = null;
    this.prevPosition = new THREE.Vector3().copy(position);

    // Visuals - Use Cache!
    const cache = MeshCache.getInstance();
    const geo =
      cache.getGeometry("sphere_0.2") || new THREE.SphereGeometry(0.2);
    const mat =
      cache.getMaterial("projectile_mat") ||
      new THREE.MeshBasicMaterial({ color: 0xffff00 });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.scene.add(this.mesh);

    // Physics
    const shape = new Sphere(0.2);
    this.body = new Body({
      mass: 1,
      position: new Vec3(position.x, position.y, position.z),
      shape: shape,
      collisionFilterGroup: 16,
      collisionFilterMask: 1 | 4,
    });
    this.body.velocity.set(
      direction.x * this.speed,
      direction.y * this.speed,
      direction.z * this.speed,
    );
    // Projectiles shouldn't rotate from physics for now, simplified
    this.body.linearDamping = 0;
    this.body.ccdSpeedThreshold = 0.08;
    this.body.ccdIterations = 10;

    this.world.addBody(this.body);

    // Collision listener
    this.body.addEventListener("collide", (e) => this.onCollide(e));
  }

  onCollide(e) {
    if (this.isDead) return;

    // Ignore collision with owner
    if (this.owner && e.body === this.owner.body) return;

    this.explode();
  }

  update(dt) {
    this.prevPosition.copy(this.mesh.position);
    this.mesh.position.copy(this.body.position);

    // Lifetime cleanup if needed (e.g. falls out of world)
    if (this.mesh.position.y < -10) this.isDead = true;
  }

  explode(point = null) {
    if (this.isDead) return;
    this.isDead = true;
    if (point) {
      this.impactPoint = point.clone();
    }

    // Visual Explosion (simple scaling sphere or particle)
    // For now, just remove.

    // Area Damage logic needs access to enemies.
    // We will handle this in Game.js by checking isDead flag and position.
  }
}

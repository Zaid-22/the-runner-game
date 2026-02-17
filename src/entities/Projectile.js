import * as THREE from "three";
import { Body, Sphere, Vec3 } from "cannon-es";
import { MeshCache } from "../utils/MeshCache.js";

export class Projectile {
  constructor(scene, world, position, direction, owner) {
    this.scene = scene;
    this.world = world;
    this.owner = owner; // 'player' or 'enemy'

    this.speed = 20;
    this.damage = 50;
    this.radius = 5; // Explosion radius
    this.isDead = false;

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
    });
    this.body.velocity.set(
      direction.x * this.speed,
      direction.y * this.speed,
      direction.z * this.speed,
    );
    // Projectiles shouldn't rotate from physics for now, simplified
    this.body.linearDamping = 0;

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
    this.mesh.position.copy(this.body.position);

    // Lifetime cleanup if needed (e.g. falls out of world)
    if (this.mesh.position.y < -10) this.isDead = true;
  }

  explode() {
    this.isDead = true;

    // Visual Explosion (simple scaling sphere or particle)
    // For now, just remove.

    // Area Damage logic needs access to enemies.
    // We will handle this in Game.js by checking isDead flag and position.
  }
}

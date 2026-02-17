import * as THREE from "three";
import { MeshCache } from "../utils/MeshCache.js";

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeParticles = [];

    // Object pools for reuse
    this.bloodPool = [];
    this.explosionPool = [];
    this.poolSize = 100; // Max particles per type

    this.initPools();
  }

  initPools() {
    const cache = MeshCache.getInstance();

    // Pre-create blood particles
    const bloodGeo =
      cache.getGeometry("particle_blood") ||
      new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const bloodMat =
      cache.getMaterial("particle_blood") ||
      new THREE.MeshBasicMaterial({ color: 0xff0000 });

    for (let i = 0; i < this.poolSize; i++) {
      const mesh = new THREE.Mesh(bloodGeo, bloodMat);
      mesh.visible = false;
      mesh.userData.noBulletBlock = true;
      this.scene.add(mesh);
      this.bloodPool.push(mesh);
    }

    // Pre-create explosion particles
    const explosionGeo =
      cache.getGeometry("particle_explosion") ||
      new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const explosionMat =
      cache.getMaterial("particle_explosion") ||
      new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    for (let i = 0; i < this.poolSize; i++) {
      const mesh = new THREE.Mesh(explosionGeo, explosionMat);
      mesh.visible = false;
      mesh.userData.noBulletBlock = true;
      this.scene.add(mesh);
      this.explosionPool.push(mesh);
    }
  }

  getParticle(pool) {
    // Find inactive particle in pool
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].visible) {
        return pool[i];
      }
    }
    return null; // Pool exhausted
  }

  update(dt) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;

      if (p.rotSpeed) {
        p.rotation.x += p.rotSpeed.x;
        p.rotation.y += p.rotSpeed.y;
      }

      if (p.velocity) {
        p.position.addScaledVector(p.velocity, dt);
        p.velocity.y -= 9.8 * dt; // Gravity
      }

      if (p.position.y < 0) {
        p.position.y = 0;
        p.velocity.set(0, 0, 0); // Splat
      }

      if (p.life <= 0) {
        // Return to pool
        p.visible = false;
        this.activeParticles.splice(i, 1);
      }
    }
  }

  reset() {
    // Immediate recycle of any active particles (used on restart/game-over cleanup).
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      if (!p) continue;
      p.visible = false;
      if (p.velocity && typeof p.velocity.set === "function") {
        p.velocity.set(0, 0, 0);
      }
      p.life = 0;
    }
    this.activeParticles.length = 0;
  }

  emitBlood(pos, count) {
    count = Math.min(count, 20); // Limit for performance

    for (let i = 0; i < count; i++) {
      const mesh = this.getParticle(this.bloodPool);
      if (!mesh) break; // Pool exhausted

      mesh.position.copy(pos);
      mesh.visible = true;
      mesh.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 2,
        (Math.random() - 0.5) * 5,
      );
      mesh.rotSpeed = new THREE.Vector3(Math.random(), Math.random(), 0);
      mesh.life = 2.0;

      this.activeParticles.push(mesh);
    }
  }

  emitExplosion(pos, count) {
    count = Math.min(count, 30); // Limit for performance

    for (let i = 0; i < count; i++) {
      const mesh = this.getParticle(this.explosionPool);
      if (!mesh) break; // Pool exhausted

      mesh.position.copy(pos);
      mesh.visible = true;

      // Random sphere direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = Math.random() * 10 + 5;

      mesh.velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta),
        speed * Math.cos(phi),
      );

      mesh.rotSpeed = new THREE.Vector3(
        Math.random(),
        Math.random(),
        Math.random(),
      );
      mesh.life = 1.0;

      this.activeParticles.push(mesh);
    }
  }

  dispose() {
    // Clean up pools
    this.bloodPool.forEach((p) => this.scene.remove(p));
    this.explosionPool.forEach((p) => this.scene.remove(p));
    this.bloodPool = [];
    this.explosionPool = [];
    this.activeParticles = [];
  }
}

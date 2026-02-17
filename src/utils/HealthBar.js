import * as THREE from "three";

export class HealthBar {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.bars = new Map(); // enemy -> bar mesh

    // Shared Geometry
    this.geometry = new THREE.PlaneGeometry(1, 0.1);

    // Shared Materials
    this.bgMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    this.fgMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
    });
  }

  createBar(enemy) {
    if (this.bars.has(enemy)) return;

    const barGroup = new THREE.Group();

    // Background (red)
    const background = new THREE.Mesh(this.geometry, this.bgMat);
    background.userData.noBulletBlock = true;
    barGroup.add(background);

    // Foreground (green) - health fill
    // Clone material for unique color/scale updates per bar without affecting others?
    // Actually, we change color based on health, so we need a clone or instance color.
    // For simplicity in this optimization step, let's clone the material.
    // Ideally we'd use InstancedMesh for 100+ enemies, but for ~50, cloning material is okay.
    const fgMat = this.fgMat.clone();
    const foreground = new THREE.Mesh(this.geometry, fgMat);
    foreground.userData.noBulletBlock = true;
    foreground.position.z = 0.01; // Slightly in front
    barGroup.add(foreground);

    // Store reference to foreground for updates
    barGroup.userData.foreground = foreground;
    barGroup.userData.enemy = enemy;
    barGroup.userData.noBulletBlock = true;

    this.scene.add(barGroup);
    this.bars.set(enemy, barGroup);
  }

  update(enemy) {
    const bar = this.bars.get(enemy);
    if (!bar || !enemy.mesh) return;

    // Position above enemy
    const enemyPos = enemy.mesh.position;
    bar.position.set(enemyPos.x, enemyPos.y + 2.5, enemyPos.z);

    // Always face camera (billboard)
    bar.quaternion.copy(this.camera.quaternion);

    // Update health fill
    const healthPercent = Math.max(0, enemy.health / enemy.maxHealth);
    const foreground = bar.userData.foreground;

    if (foreground) {
      if (Math.abs(foreground.scale.x - healthPercent) > 0.01) {
        foreground.scale.x = healthPercent;
        foreground.position.x = -(1 - healthPercent) / 2; // Align left

        // Color gradient: green -> yellow -> red
        if (healthPercent > 0.5) {
          foreground.material.color.setHex(0x00ff00); // Green
        } else if (healthPercent > 0.25) {
          foreground.material.color.setHex(0xffff00); // Yellow
        } else {
          foreground.material.color.setHex(0xff6600); // Orange-red
        }
      }
    }
  }

  remove(enemy) {
    const bar = this.bars.get(enemy);
    if (bar) {
      // Dispose unique material
      if (bar.userData.foreground) {
        bar.userData.foreground.material.dispose();
      }
      this.scene.remove(bar);
      this.bars.delete(enemy);
    }
  }

  clear() {
    for (const [enemy] of this.bars) {
      this.remove(enemy);
    }
  }

  updateAll(enemies) {
    // 1. Remove bars for enemies that are dead OR no longer in the list
    const activeEnemySet = new Set(enemies);

    for (const [enemy, bar] of this.bars) {
      if (enemy.isDead || !activeEnemySet.has(enemy)) {
        this.remove(enemy);
      }
    }

    // 2. Create/Update bars for current enemies
    enemies.forEach((enemy) => {
      if (!enemy.isDead) {
        if (!this.bars.has(enemy)) {
          this.createBar(enemy);
        }
        this.update(enemy); // We can throttle this if needed, e.g. every 5 frames
      }
    });
  }
}

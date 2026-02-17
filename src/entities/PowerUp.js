import * as THREE from "three";
import { Body, Box, Vec3 } from "cannon-es";

export class PowerUp {
  static labelTextures = {};
  static auraTextures = {};
  static circleTexture = null;

  constructor(scene, world, position, type = "health") {
    this.scene = scene;
    this.world = world;
    this.position = position;
    this.type = type; // 'health', 'ammo', 'speed', 'damage'
    this.collected = false;
    this.time = 0;

    this.init();
  }

  static getVisualConfig(type) {
    switch (type) {
      case "health":
        return {
          color: 0x42ff8a,
          accent: 0xeffff5,
          label: "HEALTH",
        };
      case "ammo":
        return {
          color: 0xffbe55,
          accent: 0xfff3d8,
          label: "AMMO",
        };
      case "speed":
        return {
          color: 0x44d9ff,
          accent: 0xe8fbff,
          label: "SPEED",
        };
      case "damage":
        return {
          color: 0xff4168,
          accent: 0xffe9ee,
          label: "DAMAGE",
        };
      default:
        return {
          color: 0xffffff,
          accent: 0xf4f4f4,
          label: type.toUpperCase(),
        };
    }
  }

  static getCircleTexture() {
    if (PowerUp.circleTexture) return PowerUp.circleTexture;

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    PowerUp.circleTexture = tex;
    return tex;
  }

  static getAuraTexture(type, colorHex) {
    const key = `${type}-${colorHex}`;
    if (PowerUp.auraTextures[key]) return PowerUp.auraTextures[key];

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    const color = `#${colorHex.toString(16).padStart(6, "0")}`;

    const core = ctx.createRadialGradient(128, 128, 8, 128, 128, 90);
    core.addColorStop(0, "rgba(255,255,255,0.95)");
    core.addColorStop(0.2, `${color}88`);
    core.addColorStop(0.55, `${color}24`);
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, 256, 256);

    const ring = ctx.createRadialGradient(128, 128, 72, 128, 128, 122);
    ring.addColorStop(0, "rgba(255,255,255,0)");
    ring.addColorStop(0.55, `${color}00`);
    ring.addColorStop(0.75, `${color}44`);
    ring.addColorStop(0.88, `${color}10`);
    ring.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ring;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    PowerUp.auraTextures[key] = tex;
    return tex;
  }

  static getLabelTexture(type, label, colorHex) {
    const key = `${type}-${label}-${colorHex}`;
    if (PowerUp.labelTextures[key]) return PowerUp.labelTextures[key];

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext("2d");
    const color = `#${colorHex.toString(16).padStart(6, "0")}`;

    const r = 22;
    ctx.clearRect(0, 0, 512, 192);
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.beginPath();
    ctx.moveTo(50 + r, 44);
    ctx.lineTo(462 - r, 44);
    ctx.quadraticCurveTo(462, 44, 462, 44 + r);
    ctx.lineTo(462, 148 - r);
    ctx.quadraticCurveTo(462, 148, 462 - r, 148);
    ctx.lineTo(50 + r, 148);
    ctx.quadraticCurveTo(50, 148, 50, 148 - r);
    ctx.lineTo(50, 44 + r);
    ctx.quadraticCurveTo(50, 44, 50 + r, 44);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.font = "900 62px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillText(label, 256, 98);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    PowerUp.labelTextures[key] = tex;
    return tex;
  }

  createIconMesh(config) {
    const coreMat = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 0.42,
      roughness: 0.25,
      metalness: 0.4,
    });
    const shellMat = new THREE.MeshStandardMaterial({
      color: config.accent,
      emissive: config.color,
      emissiveIntensity: 0.18,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.74,
    });

    if (this.type === "health") {
      const icon = new THREE.Group();
      const boxGeo = new THREE.BoxGeometry(0.12, 0.42, 0.12);
      const vertical = new THREE.Mesh(boxGeo, coreMat);
      const horizontal = new THREE.Mesh(boxGeo, coreMat);
      horizontal.rotation.z = Math.PI / 2;
      icon.add(vertical);
      icon.add(horizontal);
      const shell = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22, 0),
        shellMat,
      );
      icon.add(shell);
      return icon;
    }

    if (this.type === "ammo") {
      const icon = new THREE.Group();
      const casingMat = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: config.color,
        emissiveIntensity: 0.32,
        roughness: 0.35,
        metalness: 0.72,
      });
      const tipMat = new THREE.MeshStandardMaterial({
        color: config.accent,
        emissive: config.color,
        emissiveIntensity: 0.2,
        roughness: 0.25,
        metalness: 0.85,
      });
      const casing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.3, 18),
        casingMat,
      );
      casing.rotation.z = Math.PI / 2;
      icon.add(casing);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 18), tipMat);
      tip.position.x = 0.22;
      tip.rotation.z = -Math.PI / 2;
      icon.add(tip);
      const shell = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.04, 12, 22),
        shellMat,
      );
      shell.rotation.x = Math.PI / 2;
      icon.add(shell);
      return icon;
    }

    if (this.type === "speed") {
      const icon = new THREE.Group();
      const arrowGeo = new THREE.ConeGeometry(0.1, 0.3, 6);
      const arrowA = new THREE.Mesh(arrowGeo, coreMat);
      arrowA.rotation.z = -Math.PI / 2;
      arrowA.position.x = 0.06;
      const arrowB = arrowA.clone();
      arrowB.position.x = -0.15;
      icon.add(arrowA);
      icon.add(arrowB);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), shellMat);
      icon.add(rail);
      return icon;
    }

    if (this.type === "damage") {
      const icon = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), coreMat);
      icon.add(core);
      const spikeGeo = new THREE.ConeGeometry(0.06, 0.18, 7);
      for (let i = 0; i < 4; i++) {
        const spike = new THREE.Mesh(spikeGeo, shellMat);
        spike.position.set(
          Math.cos((i / 4) * Math.PI * 2) * 0.12,
          0,
          Math.sin((i / 4) * Math.PI * 2) * 0.12,
        );
        spike.rotation.z = Math.PI / 2;
        spike.rotation.y = (i / 4) * Math.PI * 2;
        icon.add(spike);
      }
      return icon;
    }

    return new THREE.Mesh(new THREE.OctahedronGeometry(0.24), coreMat);
  }

  init() {
    this.mesh = new THREE.Group();
    this.mesh.userData.noBulletBlock = true;
    this.visualConfig = PowerUp.getVisualConfig(this.type);

    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x1a2129,
      roughness: 0.42,
      metalness: 0.55,
      emissive: 0x0b1218,
      emissiveIntensity: 0.25,
    });

    const topMat = new THREE.MeshStandardMaterial({
      color: this.visualConfig.accent,
      emissive: this.visualConfig.color,
      emissiveIntensity: 0.18,
      roughness: 0.2,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
    });

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.62, 0.2, 22),
      platformMat,
    );
    platform.position.y = 0.14;
    platform.castShadow = true;
    this.mesh.add(platform);

    const platformTop = new THREE.Mesh(new THREE.CircleGeometry(0.5, 26), topMat);
    platformTop.rotation.x = -Math.PI / 2;
    platformTop.position.y = 0.25;
    this.mesh.add(platformTop);

    this.iconPivot = new THREE.Group();
    this.iconPivot.position.y = 0.95;
    this.mesh.add(this.iconPivot);

    this.icon = this.createIconMesh(this.visualConfig);
    this.iconPivot.add(this.icon);

    this.outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.022, 12, 44),
      new THREE.MeshBasicMaterial({
        color: this.visualConfig.color,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.outerRing.position.y = 0.95;
    this.outerRing.rotation.x = Math.PI / 2;
    this.mesh.add(this.outerRing);

    this.innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.012, 10, 30),
      new THREE.MeshBasicMaterial({
        color: this.visualConfig.accent,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.innerRing.position.y = 0.95;
    this.innerRing.rotation.y = Math.PI / 2;
    this.mesh.add(this.innerRing);

    const auraTexture = PowerUp.getAuraTexture(
      this.type,
      this.visualConfig.color,
    );
    this.aura = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: auraTexture,
        color: this.visualConfig.accent,
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.aura.position.y = 0.95;
    this.aura.scale.set(2.1, 2.1, 1);
    this.mesh.add(this.aura);

    this.auraBack = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: auraTexture,
        color: this.visualConfig.color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.auraBack.position.y = 0.95;
    this.auraBack.scale.set(2.7, 2.7, 1);
    this.mesh.add(this.auraBack);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.2, 1.3, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: this.visualConfig.color,
        transparent: true,
        opacity: 0.11,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.y = 0.85;
    this.mesh.add(beam);

    this.orbiters = [];
    const orbiterMat = new THREE.MeshBasicMaterial({
      color: this.visualConfig.accent,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const orbiterGeo = new THREE.SphereGeometry(0.05, 10, 10);
    for (let i = 0; i < 3; i++) {
      const orbiter = new THREE.Mesh(orbiterGeo, orbiterMat);
      orbiter.position.y = 0.95;
      this.mesh.add(orbiter);
      this.orbiters.push({
        mesh: orbiter,
        angle: (i / 3) * Math.PI * 2,
        speed: 0.9 + i * 0.35,
      });
    }

    this.sparkle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: PowerUp.getCircleTexture(),
        color: this.visualConfig.accent,
        transparent: true,
        opacity: 0.46,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.sparkle.position.y = 1.15;
    this.sparkle.scale.set(0.25, 0.25, 1);
    this.mesh.add(this.sparkle);

    const labelTexture = PowerUp.getLabelTexture(
      this.type,
      this.visualConfig.label,
      this.visualConfig.color,
    );
    this.labelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: labelTexture,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    );
    this.labelSprite.position.y = 1.9;
    this.labelSprite.scale.set(2.2, 0.82, 1);
    this.mesh.add(this.labelSprite);

    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);

    // Physics (trigger zone)
    const shape = new Box(new Vec3(0.5, 0.5, 0.5));
    this.body = new Body({
      mass: 0, // Static
      position: new Vec3(this.position.x, this.position.y, this.position.z),
      shape: shape,
      isTrigger: true,
    });
    this.world.addBody(this.body);
  }

  update(dt) {
    if (this.collected) return;

    this.time += dt;

    const bob = Math.sin(this.time * 2.4) * 0.1;
    const pulse = 1.0 + Math.sin(this.time * 5.2) * 0.05;

    if (this.iconPivot) {
      this.iconPivot.position.y = 0.95 + bob;
      this.iconPivot.rotation.y += dt * 1.6;
      this.iconPivot.scale.setScalar(pulse);
    }

    if (this.outerRing) {
      this.outerRing.rotation.z += dt * 1.45;
      this.outerRing.position.y = 0.95 + bob * 0.65;
    }

    if (this.innerRing) {
      this.innerRing.rotation.x += dt * 2.5;
      this.innerRing.rotation.z -= dt * 1.6;
      this.innerRing.position.y = 0.95 + bob * 0.9;
    }

    if (this.aura) {
      this.aura.position.y = 0.95 + bob * 0.5;
      this.aura.material.opacity = 0.26 + Math.sin(this.time * 4.4) * 0.08;
      const auraScale = 2.0 + Math.sin(this.time * 3.2) * 0.1;
      this.aura.scale.set(auraScale, auraScale, 1);
    }

    if (this.auraBack) {
      this.auraBack.position.y = 0.95 + bob * 0.3;
      this.auraBack.material.opacity = 0.13 + Math.sin(this.time * 2.8) * 0.05;
      const backScale = 2.55 + Math.sin(this.time * 2.1) * 0.16;
      this.auraBack.scale.set(backScale, backScale, 1);
    }

    if (this.orbiters?.length) {
      for (const orbiter of this.orbiters) {
        const angle = orbiter.angle + this.time * orbiter.speed;
        const radius = 0.34 + Math.sin(this.time * 2.2 + orbiter.speed) * 0.04;
        orbiter.mesh.position.x = Math.cos(angle) * radius;
        orbiter.mesh.position.z = Math.sin(angle) * radius;
        orbiter.mesh.position.y =
          0.95 + bob * 0.4 + Math.sin(this.time * 6.0 + angle) * 0.05;
      }
    }

    if (this.sparkle) {
      this.sparkle.material.opacity = 0.34 + Math.sin(this.time * 10) * 0.14;
      const sparkleScale = 0.16 + Math.sin(this.time * 8.2) * 0.05;
      this.sparkle.scale.set(sparkleScale, sparkleScale, 1);
      this.sparkle.position.y = 1.12 + bob * 0.25;
    }

    if (this.labelSprite) {
      this.labelSprite.position.y = 1.9 + bob * 0.2;
      this.labelSprite.material.opacity = 0.66 + Math.sin(this.time * 3.6) * 0.05;
    }
  }

  collect() {
    if (this.collected) return null;

    this.collected = true;

    if (this.mesh) this.scene.remove(this.mesh);
    if (this.body) this.world.removeBody(this.body);
    this.dispose();

    return this.type;
  }

  checkCollision(playerPosition) {
    if (this.collected) return false;

    const dist = new THREE.Vector3()
      .copy(this.position)
      .distanceTo(playerPosition);

    return dist < 1.5; // Collection radius
  }

  dispose() {
    if (!this.mesh) return;

    this.mesh.traverse((child) => {
      if (!child.isMesh && !child.isSprite) return;
      if (child.geometry) child.geometry.dispose();
      if (!child.material) return;
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => mat?.dispose?.());
      } else {
        child.material.dispose?.();
      }
    });

    this.mesh = null;
  }
}

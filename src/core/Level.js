import * as THREE from "three";
import { Body, Box, Vec3 } from "cannon-es";
import { TextureGenerator } from "../utils/TextureGenerator.js";

export class Level {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.currentArenaPhase = -1;
    this.dynamicTrapSets = [];
    this.dynamicArenaSets = [];
    this.animatedTrapParts = [];
    this.trapTime = 0;
    this.init();
  }

  init() {
    this.createMaterials();

    // 1. Floating Temple Floor
    this.createFloor();
    this.createCenterSanctum();

    // 2. The Temple Entrance (North side)
    for (let x = -15; x <= 15; x += 10) {
      this.createPillar(x, 0, -45, 3, 12, this.materials.hieroglyph);
    }
    this.createWall(0, 13, -45, 40, 3, 5, this.materials.polishedSandstone);

    // 3. Obelisks / Large Pillars - closer together
    this.createPillar(30, 0, 30, 5, 20, this.materials.hieroglyph);
    this.createPillar(-30, 0, 30, 5, 20, this.materials.hieroglyph);
    this.createPillar(30, 0, -30, 5, 20, this.materials.hieroglyph);
    this.createPillar(-30, 0, -30, 5, 20, this.materials.hieroglyph);

    // 4. Pyramids (Interesting structures!) - scaled for smaller arena
    this.createPyramid(40, 0, 0, 12, this.materials.sandstone);
    this.createPyramid(-40, 0, 0, 10, this.materials.sandstone);

    // 5. Ramps for vertical gameplay - adjusted positions
    this.createRamp(20, 0, 35, 15, 6, 12, this.materials.sandstone);
    this.createRamp(-20, 0, -35, 15, 6, 12, this.materials.sandstone);

    // 6. Platforms at different heights
    this.createPlatform(0, 4, 45, 12, 2, 12, this.materials.hieroglyph);
    this.createPlatform(0, 4, -45, 12, 2, 12, this.materials.hieroglyph);

    // 7. Arches for cover - closer to center
    this.createArch(35, 0, 20, this.materials.sandstone);
    this.createArch(-35, 0, -20, this.materials.sandstone);

    // 8. Keep the center cleaner to reduce boss pathing locks.
    this.createWall(0, 1.5, 12, 10, 3, 2, this.materials.sandstone);
    this.createWall(0, 1.5, -12, 10, 3, 2, this.materials.sandstone);
    this.createWall(12, 1.5, 0, 2, 3, 10, this.materials.sandstone);
    this.createWall(-12, 1.5, 0, 2, 3, 10, this.materials.sandstone);

    // 10. Ruin Clusters (Replaces random filler)
    this.createRuinCluster(25, 25);
    this.createRuinCluster(-25, 25);
    this.createRuinCluster(25, -25);
    this.createRuinCluster(-25, -25);

    // 11. Arena artifact field (more organic than plain cylinders)
    this.createArtifactField();
    this.createPerimeterRunes();

    // 12. Dynamic trap/scenery sets for phase-based arena changes.
    this.createDynamicTrapSets();
    this.createDynamicArenaSets();
    this.setArenaPhase(1);
  }

  createMaterials() {
    this.materials = {};

    // Polished Sandstone (Bright)
    const sandTex = new THREE.CanvasTexture(
      TextureGenerator.createPolishedSandstone(),
    );
    this.materials.polishedSandstone = new THREE.MeshStandardMaterial({
      map: sandTex,
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
    });

    // Mosaic Floor (Arena Base)
    const mosaicTex = new THREE.CanvasTexture(
      TextureGenerator.createMosaicFloor(),
    );
    mosaicTex.wrapS = THREE.RepeatWrapping;
    mosaicTex.wrapT = THREE.RepeatWrapping;
    mosaicTex.repeat.set(4, 4);
    this.materials.mosaic = new THREE.MeshStandardMaterial({
      map: mosaicTex,
      roughness: 0.2,
      metalness: 0.3,
      // envMapIntensity removed to avoid shader issues without envMap
    });

    // Old Dark Metal (Kept for contrast in ruins)
    this.materials.sandstone = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.4,
    });

    // Neon/Hieroglyph
    this.materials.hieroglyph = new THREE.MeshStandardMaterial({
      color: 0xffd700, // Gold tint
      emissive: 0xffaa00, // Golden/Orange glow
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.materials.trapMetal = new THREE.MeshStandardMaterial({
      color: 0x6f7580,
      roughness: 0.35,
      metalness: 0.95,
      emissive: 0x111722,
      emissiveIntensity: 0.24,
    });

    this.materials.trapGlow = new THREE.MeshStandardMaterial({
      color: 0xff5b2e,
      emissive: 0xff3a11,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.6,
      toneMapped: false,
    });

    this.materials.runeGlow = new THREE.MeshBasicMaterial({
      color: 0x38d8ff,
      transparent: true,
      opacity: 0.8,
    });

    this.materials.obsidian = new THREE.MeshStandardMaterial({
      color: 0x0f131a,
      roughness: 0.42,
      metalness: 0.86,
      emissive: 0x070d15,
      emissiveIntensity: 0.2,
    });

    this.materials.phaseGlow = new THREE.MeshStandardMaterial({
      color: 0x5fd8ff,
      emissive: 0x3fc9ff,
      emissiveIntensity: 1.25,
      roughness: 0.18,
      metalness: 0.72,
      toneMapped: false,
    });

    this.materials.banner = new THREE.MeshStandardMaterial({
      color: 0x27313e,
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
  }

  createFloor() {
    // Create 4 quadrants with a gap in the middle (The Hole)
    // Arena size: 100x100 approx. Hole size: 20x20.

    const floorY = -2; // Slightly thick floor
    const thickness = 4;

    // Function to create floor block
    const addBlock = (x, z, w, d) => {
      this.createWall(x, floorY, z, w, thickness, d, this.materials.mosaic);
    };

    // North Section
    addBlock(0, -35, 90, 40);
    // South Section
    addBlock(0, 35, 90, 40);
    // West Section (between N and S)
    addBlock(-35, 0, 20, 30);
    // East Section
    addBlock(35, 0, 20, 30);

    // Decorative trim around the hole
    addBlock(0, -16, 30, 2); // N Rim
    addBlock(0, 16, 30, 2); // S Rim
    addBlock(-16, 0, 2, 30); // W Rim
    addBlock(16, 0, 2, 30); // E Rim

    // INVISIBLE HOLE COVER FOR ENEMIES ONLY
    // Collision Filter Group: 8 (Enemy Floor)
    // Collision Filter Mask: 4 (Only collides with Enemy Group 4)
    this.createHoleCover(0, floorY, 0, 20, thickness, 20);

    // Floating Debris around the island
    this.createFloatingDebris();
  }

  createHoleCover(x, y, z, w, h, d) {
    // Physics ONLY (No Mesh)
    const body = new Body({
      type: Body.STATIC,
      shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
      position: new Vec3(x, y, z),
      collisionFilterGroup: 8,
      collisionFilterMask: 4, // Only Enemies (Group 4)
    });
    this.world.addBody(body);
  }

  createFloatingDebris() {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 40;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = -5 - Math.random() * 20;

      const size = 2 + Math.random() * 5;
      this.createWall(x, y, z, size, size, size, this.materials.sandstone);
    }
  }

  createCenterSanctum() {
    const sanctumRing = new THREE.Mesh(
      new THREE.TorusGeometry(13.4, 0.52, 16, 58),
      this.materials.obsidian,
    );
    sanctumRing.rotation.x = Math.PI / 2;
    sanctumRing.position.y = 0.16;
    sanctumRing.castShadow = true;
    sanctumRing.receiveShadow = true;
    this.scene.add(sanctumRing);

    const innerRune = new THREE.Mesh(
      new THREE.RingGeometry(10.9, 12.6, 36),
      this.materials.runeGlow,
    );
    innerRune.rotation.x = -Math.PI / 2;
    innerRune.position.y = 0.19;
    this.scene.add(innerRune);

    const outerRune = new THREE.Mesh(
      new THREE.RingGeometry(13.9, 14.6, 44),
      this.materials.runeGlow,
    );
    outerRune.rotation.x = -Math.PI / 2;
    outerRune.position.y = 0.18;
    this.scene.add(outerRune);

    this.animatedTrapParts.push({ mesh: sanctumRing, pulse: 0.45, baseScale: 1.0 });
    this.animatedTrapParts.push({ mesh: innerRune, spinZ: 0.2 });
    this.animatedTrapParts.push({ mesh: outerRune, spinZ: -0.16 });

    const cardinal = [
      [18, 0],
      [-18, 0],
      [0, 18],
      [0, -18],
    ];
    cardinal.forEach(([x, z], idx) => {
      this.createArenaPylon(x, z, 1 + idx * 0.04, this.scene, true, true);
    });

    // Suspended arc fragments make the center feel intentional without blocking pathing.
    for (let i = 0; i < 4; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(7.6, 0.14, 8, 30, Math.PI * 0.46),
        this.materials.obsidian,
      );
      arc.position.y = 3.7;
      arc.rotation.y = (i / 4) * Math.PI * 2;
      arc.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.28;
      this.scene.add(arc);
      this.animatedTrapParts.push({
        mesh: arc,
        spinY: (i % 2 === 0 ? 1 : -1) * 0.14,
        bobAmp: 0.12,
        bobSpeed: 1.3,
        bobOffset: i * 0.9,
      });
    }
  }

  createArenaPylon(
    x,
    z,
    scale = 1,
    parent = this.scene,
    animatedCore = true,
    addPhysics = false,
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95 * scale, 0),
      this.materials.obsidian,
    );
    base.position.y = 0.76 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17 * scale, 0.28 * scale, 2.2 * scale, 7),
      this.materials.trapMetal,
    );
    spine.position.y = 2.05 * scale;
    spine.castShadow = true;
    group.add(spine);

    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34 * scale, 0),
      this.materials.phaseGlow,
    );
    crown.position.y = 3.32 * scale;
    group.add(crown);

    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 * scale, 0.42 * scale, 5),
        this.materials.trapMetal,
      );
      const a = (i / 4) * Math.PI * 2;
      shard.position.set(
        Math.cos(a) * 0.36 * scale,
        2.72 * scale,
        Math.sin(a) * 0.36 * scale,
      );
      shard.rotation.x = Math.PI;
      shard.rotation.y = a;
      group.add(shard);
    }

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8 * scale, 1.4 * scale),
      this.materials.banner,
    );
    flag.position.set(0.34 * scale, 2.24 * scale, 0);
    flag.rotation.y = -Math.PI / 2;
    group.add(flag);

    parent.add(group);

    if (animatedCore) {
      this.animatedTrapParts.push({ mesh: crown, pulse: 3.8, baseScale: 1.0 });
      this.animatedTrapParts.push({
        mesh: flag,
        bobAmp: 0.08 * scale,
        bobSpeed: 2.6,
        bobOffset: x * 0.03 + z * 0.04,
      });
    }

    if (addPhysics) {
      const body = new Body({
        type: Body.STATIC,
        shape: new Box(new Vec3(0.62 * scale, 1.72 * scale, 0.62 * scale)),
        position: new Vec3(x, 1.72 * scale, z),
      });
      this.world.addBody(body);
    }

    return group;
  }

  createShardTotem(x, z, scale = 1, addPhysics = true) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.88 * scale, 0),
      this.materials.sandstone,
    );
    base.position.y = 0.76 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.92 * scale, 0.08 * scale, 8, 24),
      this.materials.trapMetal,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.46 * scale;
    group.add(ring);

    const shardCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22 * scale, 0),
      this.materials.phaseGlow,
    );
    shardCore.position.y = 1.52 * scale;
    group.add(shardCore);

    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.2 * scale, 0),
        this.materials.obsidian,
      );
      const a = (i / 6) * Math.PI * 2;
      spike.position.set(
        Math.cos(a) * 0.62 * scale,
        1.18 * scale + Math.sin(a * 2) * 0.08 * scale,
        Math.sin(a) * 0.62 * scale,
      );
      spike.lookAt(0, 1.54 * scale, 0);
      group.add(spike);
    }

    this.scene.add(group);

    this.animatedTrapParts.push({ mesh: ring, spinY: 1.1 });
    this.animatedTrapParts.push({ mesh: shardCore, pulse: 4.2, baseScale: 1.0 });

    if (addPhysics) {
      const body = new Body({
        type: Body.STATIC,
        shape: new Box(new Vec3(0.86 * scale, 1.1 * scale, 0.86 * scale)),
        position: new Vec3(x, 1.1 * scale, z),
      });
      this.world.addBody(body);
    }

    return group;
  }

  createArtifactField() {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 17 + Math.random() * 21;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scale = 0.82 + Math.random() * 0.5;
      this.createShardTotem(x, z, scale, true);
    }
  }

  createPerimeterRunes() {
    const radius = 41.5;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const pylon = this.createArenaPylon(
        x,
        z,
        0.72,
        this.scene,
        true,
        false,
      );

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 1.15, 18),
        this.materials.runeGlow,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      pylon.add(ring);
      this.animatedTrapParts.push({ mesh: ring, spinZ: 0.62 });
    }
  }

  createDynamicArenaSets() {
    const setA = new THREE.Group();
    const setB = new THREE.Group();
    const setC = new THREE.Group();
    this.scene.add(setA);
    this.scene.add(setB);
    this.scene.add(setC);

    // Phase 1: Four beacon pylons and crossing rune hoops.
    [
      [24, 14],
      [-24, 14],
      [24, -14],
      [-24, -14],
    ].forEach(([x, z]) => {
      this.createArenaPylon(x, z, 0.96, setA, true, false);
    });
    const hoopA = new THREE.Mesh(
      new THREE.TorusGeometry(8.8, 0.08, 8, 34),
      this.materials.phaseGlow,
    );
    hoopA.position.set(0, 4.6, 0);
    hoopA.rotation.x = Math.PI / 2;
    setA.add(hoopA);
    this.animatedTrapParts.push({ mesh: hoopA, spinY: 0.25, pulse: 0.65, baseScale: 1.0 });

    // Phase 2: Orbiting shards around center.
    for (let i = 0; i < 6; i++) {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        this.materials.phaseGlow,
      );
      setB.add(shard);
      this.animatedTrapParts.push({
        mesh: shard,
        orbitCenter: new THREE.Vector3(0, 4.1, 0),
        orbitRadius: 11 + (i % 2) * 2.6,
        orbitSpeed: 0.35 + i * 0.03,
        orbitPhase: (i / 6) * Math.PI * 2,
        bobAmp: 0.34,
        bobSpeed: 1.9,
      });
    }
    const ringB = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.8, 0.08, 84, 12, 2, 5),
      this.materials.obsidian,
    );
    ringB.position.set(0, 3.8, 0);
    setB.add(ringB);
    this.animatedTrapParts.push({ mesh: ringB, spinY: -0.5, spinX: 0.25 });

    // Phase 3: Final crown with floating sentinels.
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(12.1, 0.22, 14, 44),
      this.materials.phaseGlow,
    );
    crown.position.set(0, 3.2, 0);
    crown.rotation.x = Math.PI / 2;
    setC.add(crown);
    this.animatedTrapParts.push({ mesh: crown, spinY: 0.34, pulse: 0.5, baseScale: 1.0 });

    for (let i = 0; i < 8; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.0, 0.48),
        this.materials.obsidian,
      );
      const a = (i / 8) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 12.1, 3.2, Math.sin(a) * 12.1);
      blade.lookAt(Math.cos(a) * 15.2, 3.2, Math.sin(a) * 15.2);
      setC.add(blade);
    }

    for (let i = 0; i < 4; i++) {
      const orb = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.58, 0),
        this.materials.phaseGlow,
      );
      setC.add(orb);
      this.animatedTrapParts.push({
        mesh: orb,
        orbitCenter: new THREE.Vector3(0, 5.2, 0),
        orbitRadius: 16.5,
        orbitSpeed: 0.24,
        orbitPhase: (i / 4) * Math.PI * 2,
        bobAmp: 0.46,
        bobSpeed: 1.4,
      });
    }

    this.dynamicArenaSets = [setA, setB, setC];
    this.dynamicArenaSets.forEach((set) => {
      set.visible = false;
    });
  }

  createDynamicTrapSets() {
    const setA = new THREE.Group();
    const setB = new THREE.Group();
    const setC = new THREE.Group();

    this.scene.add(setA);
    this.scene.add(setB);
    this.scene.add(setC);

    this.createSpikeTrap(13, 13, 1.05, setA);
    this.createSpikeTrap(-13, -13, 1.05, setA);
    this.createSawTrap(-13, 13, 1.0, setA);
    this.createSawTrap(13, -13, 1.0, setA);

    this.createRuneTrap(0, -24, 1.1, setB);
    this.createRuneTrap(0, 24, 1.1, setB);
    this.createSawTrap(-22, 0, 0.92, setB);
    this.createSawTrap(22, 0, 0.92, setB);

    this.createSpikeTrap(0, 18, 1.2, setC);
    this.createSpikeTrap(0, -18, 1.2, setC);
    this.createRuneTrap(18, 0, 1.05, setC);
    this.createRuneTrap(-18, 0, 1.05, setC);

    this.dynamicTrapSets = [setA, setB, setC];
    this.dynamicTrapSets.forEach((set) => {
      set.visible = false;
    });
  }

  setArenaPhase(waveNum = 1) {
    let phase = 0;
    if (waveNum >= 5) phase = 2;
    else if (waveNum >= 3) phase = 1;

    if (phase === this.currentArenaPhase && this.currentArenaPhase !== -1) return;
    this.currentArenaPhase = phase;

    this.dynamicTrapSets.forEach((set, idx) => {
      set.visible = idx === phase;
    });

    this.dynamicArenaSets.forEach((set, idx) => {
      set.visible = idx === phase;
    });

    const palettes = [
      { trap: 0xff5b2e, rune: 0x38d8ff, phaseGlow: 0x5fd8ff, fog: 0xfff0d0 },
      { trap: 0xffb74d, rune: 0x7df3ff, phaseGlow: 0x8af6ff, fog: 0xffead2 },
      { trap: 0x51ccff, rune: 0x98ffde, phaseGlow: 0x7fe8ff, fog: 0xdde8ff },
    ];
    const palette = palettes[phase] || palettes[0];

    if (this.materials.trapGlow) {
      this.materials.trapGlow.color.setHex(palette.trap);
      this.materials.trapGlow.emissive.setHex(palette.trap);
      this.materials.trapGlow.emissiveIntensity = phase === 2 ? 2.05 : 1.75;
    }
    if (this.materials.runeGlow) {
      this.materials.runeGlow.color.setHex(palette.rune);
      this.materials.runeGlow.opacity = phase === 2 ? 0.95 : 0.82;
    }
    if (this.materials.phaseGlow) {
      this.materials.phaseGlow.color.setHex(palette.phaseGlow);
      this.materials.phaseGlow.emissive.setHex(palette.phaseGlow);
      this.materials.phaseGlow.emissiveIntensity = phase === 2 ? 1.55 : 1.25;
    }
    if (this.scene.fog) {
      this.scene.fog.color.setHex(palette.fog);
    }
  }

  update(dt) {
    this.trapTime += dt;
    for (const part of this.animatedTrapParts) {
      if (!part || !part.mesh) continue;
      if (part.spinX) part.mesh.rotation.x += part.spinX * dt;
      if (part.spinY) part.mesh.rotation.y += part.spinY * dt;
      if (part.spinZ) part.mesh.rotation.z += part.spinZ * dt;
      if (part.pulse) {
        const s = part.baseScale * (1 + Math.sin(this.trapTime * part.pulse) * 0.18);
        part.mesh.scale.setScalar(s);
      }
      if (part.orbitCenter && Number.isFinite(part.orbitRadius)) {
        const a = this.trapTime * (part.orbitSpeed || 0.2) + (part.orbitPhase || 0);
        part.mesh.position.x = part.orbitCenter.x + Math.cos(a) * part.orbitRadius;
        part.mesh.position.z = part.orbitCenter.z + Math.sin(a) * part.orbitRadius;
        part.mesh.position.y = part.orbitCenter.y;
      }
      if (part.bobAmp) {
        if (!Number.isFinite(part.baseY)) {
          part.baseY = part.orbitCenter ? part.orbitCenter.y : part.mesh.position.y;
        }
        const anchorY = part.orbitCenter ? part.orbitCenter.y : part.baseY;
        const bob = Math.sin(
          this.trapTime * (part.bobSpeed || 1.8) + (part.bobOffset || 0),
        ) * part.bobAmp;
        part.mesh.position.y = anchorY + bob;
      }
    }
  }

  createSpikeTrap(x, z, scale = 1, parent = this.scene) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8 * scale, 0.34 * scale, 14, 28),
      this.materials.trapMetal,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.45 * scale;
    ring.castShadow = true;
    group.add(ring);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34 * scale, 0),
      this.materials.trapGlow,
    );
    core.position.y = 0.72 * scale;
    group.add(core);

    for (let i = 0; i < 10; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.13 * scale, 0.85 * scale, 5),
        this.materials.trapMetal,
      );
      const angle = (i / 10) * Math.PI * 2;
      spike.position.set(
        Math.cos(angle) * 1.15 * scale,
        0.64 * scale,
        Math.sin(angle) * 1.15 * scale,
      );
      spike.rotation.x = Math.PI;
      spike.castShadow = true;
      group.add(spike);
    }

    parent.add(group);
    this.animatedTrapParts.push({ mesh: core, pulse: 3.2, baseScale: 1.0 });
    return group;
  }

  createSawTrap(x, z, scale = 1, parent = this.scene) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(1.45 * scale, 0.12 * scale, 8, 26),
      this.materials.trapMetal,
    );
    blade.rotation.x = Math.PI / 2;
    blade.position.y = 0.78 * scale;
    blade.castShadow = true;
    group.add(blade);

    for (let i = 0; i < 12; i++) {
      const tooth = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.2 * scale, 0),
        this.materials.trapMetal,
      );
      const angle = (i / 12) * Math.PI * 2;
      tooth.position.set(
        Math.cos(angle) * 1.55 * scale,
        0.78 * scale,
        Math.sin(angle) * 1.55 * scale,
      );
      tooth.lookAt(0, 0.78 * scale, 0);
      tooth.rotateX(Math.PI / 2);
      group.add(tooth);
    }

    const hub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.28 * scale, 0),
      this.materials.trapGlow,
    );
    hub.position.y = 0.78 * scale;
    group.add(hub);

    parent.add(group);
    this.animatedTrapParts.push({ mesh: blade, spinY: 1.9 });
    this.animatedTrapParts.push({ mesh: hub, pulse: 4.4, baseScale: 1.0 });
    return group;
  }

  createRuneTrap(x, z, scale = 1, parent = this.scene) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.7 * scale, 0.14 * scale, 52, 8, 2, 3),
      this.materials.trapMetal,
    );
    knot.position.y = 0.86 * scale;
    knot.castShadow = true;
    group.add(knot);

    const glyph = new THREE.Mesh(
      new THREE.RingGeometry(0.55 * scale, 1.25 * scale, 18),
      this.materials.runeGlow,
    );
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.y = 0.22 * scale;
    group.add(glyph);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.25 * scale, 0),
      this.materials.trapGlow,
    );
    core.position.y = 0.86 * scale;
    group.add(core);

    parent.add(group);
    this.animatedTrapParts.push({ mesh: knot, spinY: 0.8 });
    this.animatedTrapParts.push({ mesh: glyph, spinZ: 0.7 });
    this.animatedTrapParts.push({ mesh: core, pulse: 5.0, baseScale: 1.0 });
    return group;
  }

  createWall(x, y, z, w, h, d, mat) {
    let finalMat = mat || this.materials.sandstone;

    if (finalMat.map) {
      // Adjust texture repeat based on size
      finalMat = finalMat.clone();
      finalMat.map = finalMat.map.clone();
      finalMat.map.needsUpdate = true;
      finalMat.map.repeat.set(Math.max(1, w / 4), Math.max(1, d / 4));
    }

    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, finalMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = new Body({
      type: Body.STATIC,
      shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
      position: new Vec3(x, y, z),
    });
    this.world.addBody(body);
  }

  createPillar(x, y, z, size, height, mat) {
    this.createWall(x, y + height / 2, z, size, height, size, mat);
  }

  createPyramid(x, y, z, size, mat) {
    // Create stepped pyramid
    const levels = 4;
    for (let i = 0; i < levels; i++) {
      const levelSize = size * (1 - i * 0.2);
      const levelHeight = size * 0.3;
      this.createWall(
        x,
        y + i * levelHeight + levelHeight / 2,
        z,
        levelSize,
        levelHeight,
        levelSize,
        mat,
      );
    }
  }

  createRamp(x, y, z, w, h, d, mat) {
    // Create a ramp using a rotated box
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat || this.materials.sandstone);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.z = Math.atan(h / d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = new Body({
      type: Body.STATIC,
      shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
      position: new Vec3(x, y + h / 2, z),
    });
    body.quaternion.setFromEuler(0, 0, Math.atan(h / d));
    this.world.addBody(body);
  }

  createPlatform(x, y, z, w, h, d, mat) {
    this.createWall(x, y, z, w, h, d, mat);
  }

  createArch(x, y, z, mat) {
    // Two pillars
    this.createWall(x - 5, y + 5, z, 3, 10, 3, mat);
    this.createWall(x + 5, y + 5, z, 3, 10, 3, mat);
    // Top beam
    this.createWall(x, y + 10, z, 13, 2, 3, mat);
  }

  createRuinCluster(centerX, centerZ) {
    // A central focus point (altar/pillar)
    this.createPillar(centerX, 0, centerZ, 2, 6, this.materials.hieroglyph);

    // Broken walls around it
    const radius = 8;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const x = centerX + Math.cos(angle) * radius;
      const z = centerZ + Math.sin(angle) * radius;

      // Random height broken wall
      const h = 2 + Math.random() * 4;
      const w = 4 + Math.random() * 2;

      // Wall
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 1.5),
        this.materials.sandstone,
      );
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = angle + Math.PI / 2; // Face center
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const body = new Body({
        type: Body.STATIC,
        shape: new Box(new Vec3(w / 2, h / 2, 0.75)),
        position: new Vec3(x, h / 2, z),
      });
      body.quaternion.setFromEuler(0, angle + Math.PI / 2, 0);
      this.world.addBody(body);

      // Fallen debris next to it
      if (Math.random() > 0.5) {
        const debrisGeo = new THREE.CylinderGeometry(0.5, 0.5, 3, 8);
        const debris = new THREE.Mesh(debrisGeo, this.materials.sandstone);
        debris.position.set(
          x + (Math.random() - 0.5) * 3,
          0.5,
          z + (Math.random() - 0.5) * 3,
        );
        debris.rotation.z = Math.PI / 2;
        debris.rotation.y = Math.random() * Math.PI;
        debris.castShadow = true;
        this.scene.add(debris);
        // No physics for small debris to save perf/avoid getting stuck
      }
    }
  }

  createCylinder(x, y, z, radius, height, mat) {
    const geo = new THREE.CylinderGeometry(radius, radius, height, 12);
    const mesh = new THREE.Mesh(geo, mat || this.materials.sandstone);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const body = new Body({
      type: Body.STATIC,
      shape: new Box(new Vec3(radius, height / 2, radius)),
      position: new Vec3(x, y, z),
    });
    this.world.addBody(body);
  }
}

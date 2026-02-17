import * as THREE from "three";

/**
 * MeshCache - Singleton for caching shared geometries and materials
 * This dramatically improves performance by reusing geometries/materials
 * instead of creating new ones for every enemy
 */
export class MeshCache {
  static instance = null;

  static getInstance() {
    if (!MeshCache.instance) {
      MeshCache.instance = new MeshCache();
    }
    return MeshCache.instance;
  }

  constructor() {
    this.geometries = new Map();
    this.materials = new Map();
    this.init();
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // --- GEOMETRIES ---

    // Primitives
    this.geometries.set("sphere_0.5", new THREE.SphereGeometry(0.5, 16, 16));
    this.geometries.set("sphere_0.3", new THREE.SphereGeometry(0.3, 16, 16));
    this.geometries.set("sphere_0.25", new THREE.SphereGeometry(0.25, 8, 8));
    this.geometries.set("sphere_0.15", new THREE.SphereGeometry(0.15, 8, 8));
    this.geometries.set("box_1", new THREE.BoxGeometry(1, 1, 1));
    this.geometries.set("box_0.5", new THREE.BoxGeometry(0.5, 0.5, 0.5));

    // Arachnid (Cyber-Spider)
    this.geometries.set("arachnid_body", new THREE.SphereGeometry(0.6, 16, 16));
    this.geometries.set(
      "arachnid_head",
      new THREE.SphereGeometry(0.35, 16, 16),
    );
    this.geometries.set(
      "arachnid_leg_upper",
      new THREE.CylinderGeometry(0.1, 0.08, 0.8, 8),
    );
    this.geometries.set(
      "arachnid_leg_lower",
      new THREE.CylinderGeometry(0.08, 0.05, 1.0, 8),
    );
    this.geometries.set("arachnid_joint", new THREE.SphereGeometry(0.15, 8, 8));
    this.geometries.set("arachnid_fang", new THREE.ConeGeometry(0.1, 0.4, 8));

    // Titan (Void Golem)
    this.geometries.set("titan_torso", new THREE.BoxGeometry(1.2, 1.0, 0.8)); // Blocky torso
    this.geometries.set("titan_limb", new THREE.BoxGeometry(0.5, 1.2, 0.5)); // Blocky limbs
    this.geometries.set("titan_head", new THREE.BoxGeometry(0.6, 0.6, 0.6)); // Blocky head
    this.geometries.set("titan_core", new THREE.OctahedronGeometry(0.4, 0)); // Crystal core

    // Specter (Neon Phantom)
    this.geometries.set(
      "specter_body",
      new THREE.ConeGeometry(0.5, 1.5, 16, 1, true),
    ); // Open cone
    this.geometries.set(
      "specter_cowl",
      new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    ); // Hemisphere hood
    this.geometries.set("specter_trail", new THREE.TetrahedronGeometry(0.2));

    // Harpy (Razor Wing)
    this.geometries.set("harpy_body", new THREE.ConeGeometry(0.4, 1.0, 4)); // Sharp pyramid body
    this.geometries.set("harpy_wing", new THREE.BufferGeometry()); // Custom wing shape - placeholder using plane
    // Let's use a simple flattened cone for wing or a thin box
    this.geometries.set(
      "harpy_wing_blade",
      new THREE.BoxGeometry(1.5, 0.05, 0.4),
    );
    this.geometries.set("harpy_head", new THREE.ConeGeometry(0.2, 0.5, 4));

    // Kamikaze (Tick-Tock Bomber)
    this.geometries.set("kamikaze_body", new THREE.SphereGeometry(0.6, 16, 16));
    this.geometries.set(
      "kamikaze_fuse_base",
      new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8),
    );
    this.geometries.set(
      "kamikaze_fuse_bulb",
      new THREE.SphereGeometry(0.2, 8, 8),
    );
    this.geometries.set(
      "kamikaze_leg",
      new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8),
    );

    // Boss (Dreadnought)
    this.geometries.set("boss_torso", new THREE.BoxGeometry(2.0, 1.5, 1.2));
    this.geometries.set("boss_shoulder", new THREE.DodecahedronGeometry(0.8));
    this.geometries.set("boss_arm", new THREE.BoxGeometry(0.6, 1.8, 0.6));
    this.geometries.set("boss_head", new THREE.BoxGeometry(0.8, 0.8, 1.0));
    this.geometries.set("boss_spike", new THREE.ConeGeometry(0.2, 0.8, 8));

    // Projectile
    this.geometries.set(
      "projectile_sphere",
      new THREE.SphereGeometry(0.2, 8, 8),
    );

    // Particles
    this.geometries.set("particle_blood", new THREE.BoxGeometry(0.1, 0.1, 0.1));
    this.geometries.set(
      "particle_explosion",
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
    );

    // --- MATERIALS ---

    // Arachnid
    this.materials.set(
      "arachnid_metal",
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0x111111,
        emissiveIntensity: 0.2,
      }),
    );
    this.materials.set(
      "arachnid_joint",
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8,
      }),
    );
    this.materials.set(
      "arachnid_eye",
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    ); // Bright red

    // Titan
    this.materials.set(
      "titan_stone",
      new THREE.MeshStandardMaterial({
        color: 0x444455,
        roughness: 0.9,
        flatShading: true,
      }),
    );
    this.materials.set(
      "titan_core",
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      }),
    );

    // Specter
    this.materials.set(
      "specter_cloth",
      new THREE.MeshStandardMaterial({
        color: 0x8800ff,
        emissive: 0x4400aa,
        emissiveIntensity: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.materials.set(
      "specter_glow",
      new THREE.MeshBasicMaterial({
        color: 0xcc88ff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      }),
    );

    // Harpy
    this.materials.set(
      "harpy_metal",
      new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.4,
        metalness: 0.6,
      }),
    );
    this.materials.set(
      "harpy_wing",
      new THREE.MeshStandardMaterial({
        color: 0xffaa00, // Gold wings
        emissive: 0xff5500,
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      }),
    );

    // Kamikaze
    this.materials.set(
      "kamikaze_skin",
      new THREE.MeshStandardMaterial({
        color: 0xaa5555,
        roughness: 0.8,
      }),
    );
    this.materials.set(
      "kamikaze_fuse_off",
      new THREE.MeshStandardMaterial({
        color: 0x330000,
      }),
    );
    this.materials.set(
      "kamikaze_fuse_on",
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2.0,
      }),
    );

    // Boss
    this.materials.set(
      "boss_armor",
      new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.2,
        metalness: 0.9,
        emissive: 0x110000,
        emissiveIntensity: 0.2,
      }),
    );
    this.materials.set(
      "boss_glow",
      new THREE.MeshStandardMaterial({
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 2.0,
      }),
    );

    // Projectile
    this.materials.set(
      "projectile_mat",
      new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    );

    // Particles
    this.materials.set(
      "particle_blood",
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    );
    this.materials.set(
      "particle_explosion",
      new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
    );

    this.materials.set(
      "boss_core_super",
      new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 3.0,
        roughness: 0.2,
      }),
    );

    // Fallbacks
    this.materials.set(
      "debug",
      new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true }),
    );
  }

  getGeometry(key) {
    const geo = this.geometries.get(key);
    if (!geo) {
      console.warn(`MeshCache: Missing geometry for key '${key}'`);
      return this.geometries.get("box_1"); // Fallback
    }
    return geo;
  }

  getMaterial(key) {
    const mat = this.materials.get(key);
    if (!mat) {
      console.warn(`MeshCache: Missing material for key '${key}'`);
      return this.materials.get("debug");
    }
    return mat;
  }

  dispose() {
    this.geometries.forEach((geo) => geo.dispose());
    this.materials.forEach((mat) => mat.dispose());
    this.geometries.clear();
    this.materials.clear();
  }
}

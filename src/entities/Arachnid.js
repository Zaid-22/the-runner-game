import * as THREE from "three";
import { Enemy } from "./Enemy.js";
import { MeshCache } from "../utils/MeshCache.js";
import { Body, Sphere, Vec3 } from "cannon-es";

export class Arachnid extends Enemy {
  constructor(scene, world, position) {
    // 1. Create Mesh BEFORE super() so the base class skips default mesh creation
    // But we can't use 'this' before super().
    // So we will call super() first, but we need to ensure the base class doesn't auto-create the default mesh if we intend to override it.
    // My updated Enemy.js checks `if (!this.mesh)`, but `this.mesh` is undefined until we assign it.
    // Solution: We let super() create the default, then we immediately remove it and replace it.
    // OR BETTER: We don't rely on Enemy's default constructor logic to be smart about subclassing if we can't pass config.
    // Actually, I modified Enemy to check !this.mesh.
    // In JS class, we must call super first.

    // Let's call super with a flag or just overwrite after.
    super(scene, world, position, "arachnid");

    // Remove the default red box if it was created
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }
    if (this.body) {
      this.world.removeBody(this.body);
    }

    this.createArachnidMesh(position);
    this.createArachnidBody(position);
  }

  createArachnidMesh(position) {
    const cache = MeshCache.getInstance();
    this.mesh = new THREE.Group();
    this.mesh.position.copy(position);

    // --- Body ---
    const bodyMesh = new THREE.Mesh(
      cache.getGeometry("arachnid_body"),
      cache.getMaterial("arachnid_metal"),
    );
    this.mesh.add(bodyMesh);

    // --- Head ---
    const headMesh = new THREE.Mesh(
      cache.getGeometry("arachnid_head"),
      cache.getMaterial("arachnid_metal"),
    );
    headMesh.position.set(0, 0.3, 0.5); // Forward and up
    this.mesh.add(headMesh);

    // --- Eyes (Glowing) ---
    const eyeGeo = cache.getGeometry("sphere_0.15"); // Use small sphere
    const eyeMat = cache.getMaterial("arachnid_eye");

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.4, 0.75);
    leftEye.scale.set(0.5, 0.5, 0.5);
    this.mesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.4, 0.75);
    rightEye.scale.set(0.5, 0.5, 0.5);
    this.mesh.add(rightEye);

    // --- Legs (8 legs) ---
    // Simple static legs for now, can animate later
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const legGroup = new THREE.Group();

      // Upper Leg
      const upperLeg = new THREE.Mesh(
        cache.getGeometry("arachnid_leg_upper"),
        cache.getMaterial("arachnid_metal"),
      );
      upperLeg.position.set(0, 0.4, 0);
      upperLeg.rotation.x = Math.PI / 4; // Angled up
      legGroup.add(upperLeg);

      // Joint
      const joint = new THREE.Mesh(
        cache.getGeometry("arachnid_joint"),
        cache.getMaterial("arachnid_joint"),
      );
      joint.position.set(0, 0.8, 0);
      legGroup.add(joint);

      // Lower Leg
      const lowerLeg = new THREE.Mesh(
        cache.getGeometry("arachnid_leg_lower"),
        cache.getMaterial("arachnid_metal"),
      );
      lowerLeg.position.set(0, 0.3, 0.4); // Offset from joint
      lowerLeg.rotation.x = -Math.PI / 2; // Point down
      joint.add(lowerLeg); // Attach to joint

      // Position the whole leg group around body
      legGroup.rotation.y = angle;
      legGroup.position.y = -0.2;
      this.mesh.add(legGroup);
    }

    this.scene.add(this.mesh);
  }

  createArachnidBody(position) {
    // Physics Body - Sphere for smoother movement than box
    const shape = new Sphere(0.6); // Match body radius
    this.body = new Body({
      mass: 5,
      position: new Vec3(position.x, position.y, position.z),
      shape: shape,
      linearDamping: 0.5, // Reduce sliding
    });
    this.world.addBody(this.body);
  }
}

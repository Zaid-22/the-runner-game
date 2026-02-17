import * as THREE from "three";
import { MeshCache } from "../utils/MeshCache.js";

export class RunnerModel {
  static createMesh(isBoss = false) {
    const cache = MeshCache.getInstance();
    const group = new THREE.Group();

    // Scale for boss
    const scale = isBoss ? 2.5 : 1.0;

    // Material Keys
    const matBody = isBoss ? "boss_body" : "runner_body";
    const matCore = isBoss ? "boss_core" : "runner_core";
    const matVein = isBoss ? "boss_vein" : "runner_vein";
    const matHead = isBoss ? "boss_body" : "runner_head"; // Boss head same as body
    const matVisor = isBoss ? "boss_visor" : "runner_visor";

    // Main Body - REUSE cached geometry and material
    const body = new THREE.Mesh(
      cache.getGeometry("box_0.7_0.9_0.4"),
      cache.getMaterial(matBody),
    );
    body.position.y = 1.1 * scale;
    body.scale.setScalar(scale);
    group.add(body);

    // Glowing Core
    const core = new THREE.Mesh(
      cache.getGeometry("sphere_0.18"),
      cache.getMaterial(matCore),
    );
    core.position.set(0, 1.1 * scale, 0.18 * scale);
    core.scale.setScalar(scale);
    group.add(core);

    // Glowing Veins
    const vein1 = new THREE.Mesh(
      cache.getGeometry("box_0.05_0.6_0.05"),
      cache.getMaterial(matVein),
    );
    vein1.position.set(-0.15 * scale, 1.1 * scale, 0.15 * scale);
    vein1.rotation.z = 0.3;
    vein1.scale.setScalar(scale);
    group.add(vein1);

    const vein2 = new THREE.Mesh(
      cache.getGeometry("box_0.05_0.6_0.05"),
      cache.getMaterial(matVein),
    );
    vein2.position.set(0.15 * scale, 1.1 * scale, 0.15 * scale);
    vein2.rotation.z = -0.3;
    vein2.scale.setScalar(scale);
    group.add(vein2);

    // Head
    const head = new THREE.Mesh(
      cache.getGeometry("box_0.5_0.5_0.5"),
      cache.getMaterial(matHead),
    );
    head.position.y = 1.8 * scale;
    head.scale.setScalar(scale);
    head.userData.isHeadshot = true; // HEADSHOT DETECTION!
    group.add(head);

    // Eye Visor
    const visor = new THREE.Mesh(
      cache.getGeometry("box_0.35_0.12_0.4"),
      cache.getMaterial(matVisor),
    );
    visor.position.set(0, 1.8 * scale, 0.15 * scale);
    visor.scale.setScalar(scale);
    visor.userData.isHeadshot = true; // HEADSHOT DETECTION!
    group.add(visor);

    // Limbs - REUSE material
    const limbMat = cache.getMaterial("runner_limb");
    const limbGeo = cache.getGeometry("box_0.18_0.8_0.18");

    // Arms
    const lArm = new THREE.Mesh(limbGeo, limbMat);
    lArm.position.set(-0.5 * scale, 1.1 * scale, 0);
    lArm.scale.setScalar(scale);
    group.add(lArm);

    const rArm = new THREE.Mesh(limbGeo, limbMat);
    rArm.position.set(0.5 * scale, 1.1 * scale, 0);
    rArm.scale.setScalar(scale);
    group.add(rArm);

    // Legs
    const lLeg = new THREE.Mesh(limbGeo, limbMat);
    lLeg.position.set(-0.2 * scale, 0.4 * scale, 0);
    lLeg.scale.setScalar(scale);
    group.add(lLeg);

    const rLeg = new THREE.Mesh(limbGeo, limbMat);
    rLeg.position.set(0.2 * scale, 0.4 * scale, 0);
    rLeg.scale.setScalar(scale);
    group.add(rLeg);

    // Store limbs for animation
    group.userData.leftArm = lArm;
    group.userData.rightArm = rArm;
    group.userData.leftLeg = lLeg;
    group.userData.rightLeg = rLeg;

    // Boss indicator
    if (isBoss) {
      group.userData.isBoss = true;
    }

    return group;
  }
}

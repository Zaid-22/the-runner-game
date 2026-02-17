import * as THREE from "three";

// Helper to create rough rock geometry
function createRockGeo(radius, detail) {
  const geo = new THREE.DodecahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Jagged Noise
    const amp = 0.1 * radius;
    pos.setXYZ(
      i,
      x + (Math.random() - 0.5) * amp,
      y + (Math.random() - 0.5) * amp,
      z + (Math.random() - 0.5) * amp,
    );
  }
  geo.computeVertexNormals();
  return geo;
}

export class TitanModel {
  static createMesh(isBoss = false) {
    const group = new THREE.Group();
    group.userData.type = "titan";

    const scale = isBoss ? 1.72 : 1.5;
    group.scale.setScalar(scale);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x252c36,
      roughness: 0.86,
      metalness: 0.18,
      flatShading: true, // Low-poly-ish rock look
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x0d131b,
      roughness: 0.42,
      metalness: 0.78,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x151d28,
      roughness: 0.5,
      metalness: 0.66,
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x75dfff,
      emissive: 0x2db8ff,
      emissiveIntensity: 2.7,
      roughness: 0.14,
      metalness: 0.52,
      toneMapped: false,
    });

    // 1. CHEST / CORE
    const chestGeo = createRockGeo(0.8, 0);
    const chest = new THREE.Mesh(chestGeo, rockMat);
    chest.position.y = 1.5;
    group.add(chest);

    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.56, 0.22),
      plateMat,
    );
    chestPlate.position.set(0, 1.5, 0.72);
    chestPlate.rotation.x = -0.04;
    group.add(chestPlate);

    // Glowing Core Insert
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), coreMat);
    core.position.set(0, 1.5, 0.3); // Partially protruding
    group.add(core);

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.07, 8, 18),
      trimMat,
    );
    coreRing.position.set(0, 1.5, 0.34);
    coreRing.rotation.x = Math.PI / 2;
    group.add(coreRing);

    // 2. SHOULDERS (Asymmetrical)
    const leftShoulder = new THREE.Mesh(createRockGeo(0.6, 0), rockMat);
    leftShoulder.position.set(-0.9, 1.9, 0);
    group.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(createRockGeo(0.5, 0), rockMat); // Smaller
    rightShoulder.position.set(0.9, 1.8, 0);
    group.add(rightShoulder);

    const leftShoulderPlate = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.48, 6),
      plateMat,
    );
    leftShoulderPlate.position.set(-1.2, 1.95, 0.08);
    leftShoulderPlate.rotation.z = -0.4;
    group.add(leftShoulderPlate);

    const rightShoulderPlate = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.42, 6),
      plateMat,
    );
    rightShoulderPlate.position.set(1.12, 1.86, 0.06);
    rightShoulderPlate.rotation.z = 0.4;
    group.add(rightShoulderPlate);

    // 3. HEAD
    const head = new THREE.Mesh(createRockGeo(0.4, 0), rockMat);
    head.position.set(0, 2.4, 0);
    group.add(head);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.12, 0.2),
      trimMat,
    );
    brow.position.set(0, 2.5, 0.28);
    group.add(brow);

    // Single Cyclops Eye
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1), coreMat);
    eye.position.set(0, 2.4, 0.35);
    group.add(eye);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.12, 2.42, 0.38);
    group.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.12, 2.42, 0.38);
    group.add(rightEyeAnchor);

    // 4. ARMS
    const armGeo = createRockGeo(0.35, 0);
    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.1, 1.8, 0);

      // Upper Arm
      const upper = new THREE.Mesh(armGeo, rockMat);
      upper.scale.set(1, 1.5, 1);
      upper.position.y = -0.4;
      pivot.add(upper);

      // Forearm
      const lower = new THREE.Mesh(armGeo, plateMat);
      lower.scale.set(1.2, 1.5, 1.2); // Big fists
      lower.position.y = -1.2;
      upper.add(lower);

      const knucklePlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.2, 0.6),
        trimMat,
      );
      knucklePlate.position.set(0, -0.18, 0.35);
      lower.add(knucklePlate);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    // 5. LEGS
    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.0, 0);

      const thigh = new THREE.Mesh(createRockGeo(0.45, 0), rockMat);
      thigh.scale.set(1, 1.5, 1);
      thigh.position.y = -0.4;
      pivot.add(thigh);

      const shin = new THREE.Mesh(createRockGeo(0.4, 0), plateMat);
      shin.scale.set(1, 1.5, 1);
      shin.position.y = -1.2;
      thigh.add(shin);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.2, 0.82),
        trimMat,
      );
      foot.position.set(0, -0.62, 0.18);
      shin.add(foot);

      return pivot;
    };

    const leftLeg = createLeg(-0.5);
    const rightLeg = createLeg(0.5);
    group.add(leftLeg);
    group.add(rightLeg);

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 - i * 0.02, 0.36 + i * 0.06, 6),
        trimMat,
      );
      spine.position.set(0, 2.0 + i * 0.35, -0.52);
      spine.rotation.x = -0.28;
      group.add(spine);
    }

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    // Animation hooks used by Enemy.updateAnimation.
    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [coreMat];

    return group;
  }
}

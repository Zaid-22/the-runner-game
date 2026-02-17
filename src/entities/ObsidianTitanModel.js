import * as THREE from "three";

export class ObsidianTitanModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "obsidian_titan_boss";

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x070b12,
      roughness: 0.36,
      metalness: 0.86,
      emissive: 0x010408,
      emissiveIntensity: 0.08,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x141d2a,
      roughness: 0.44,
      metalness: 0.82,
      emissive: 0x040810,
      emissiveIntensity: 0.12,
    });
    const basaltMat = new THREE.MeshStandardMaterial({
      color: 0x232d3b,
      roughness: 0.78,
      metalness: 0.2,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x89ecff,
      emissive: 0x44d4ff,
      emissiveIntensity: 2.1,
      roughness: 0.14,
      metalness: 0.58,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x5bd4ff,
      emissive: 0x39bfff,
      emissiveIntensity: 1.45,
      roughness: 0.22,
      metalness: 0.52,
      toneMapped: false,
    });

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.72, 1.22),
      obsidianMat,
    );
    pelvis.position.y = 1.5;
    group.add(pelvis);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(2.12, 1.74, 1.48),
      obsidianMat,
    );
    torso.position.y = 2.64;
    group.add(torso);

    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 1.05, 0.26),
      armorMat,
    );
    chestPlate.position.set(0, 2.62, 0.84);
    chestPlate.rotation.x = -0.05;
    group.add(chestPlate);

    const chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      glowMat,
    );
    chestCore.position.set(0, 2.62, 0.9);
    group.add(chestCore);

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.04, 8, 22),
      runeMat,
    );
    coreRing.position.set(0, 2.62, 0.88);
    coreRing.rotation.x = Math.PI / 2;
    group.add(coreRing);

    const headPivot = new THREE.Group();
    headPivot.position.y = 3.82;
    group.add(headPivot);

    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.88, 1.06),
      obsidianMat,
    );
    helm.position.set(0, 0, 0.02);
    headPivot.add(helm);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.16, 0.18),
      armorMat,
    );
    brow.position.set(0, 0.16, 0.48);
    headPivot.add(brow);

    const jawGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.24, 0.3),
      armorMat,
    );
    jawGuard.position.set(0, -0.26, 0.42);
    headPivot.add(jawGuard);

    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.46, 6),
      basaltMat,
    );
    crest.position.set(0, 0.52, -0.12);
    crest.rotation.x = -0.14;
    headPivot.add(crest);

    const leftHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.46, 6),
      basaltMat,
    );
    leftHorn.position.set(-0.32, 0.38, 0.15);
    leftHorn.rotation.set(-0.3, 0, -0.5);
    headPivot.add(leftHorn);

    const rightHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.46, 6),
      basaltMat,
    );
    rightHorn.position.set(0.32, 0.38, 0.15);
    rightHorn.rotation.set(-0.3, 0, 0.5);
    headPivot.add(rightHorn);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 10),
      glowMat,
    );
    leftEye.position.set(-0.18, 0.02, 0.56);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 10),
      glowMat,
    );
    rightEye.position.set(0.18, 0.02, 0.56);
    headPivot.add(rightEye);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.18, 0.02, 0.59);
    headPivot.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.18, 0.02, 0.59);
    headPivot.add(rightEyeAnchor);

    const leftShoulder = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.44, 0.42, 6, 12),
      armorMat,
    );
    leftShoulder.position.set(-1.46, 3.02, 0.02);
    leftShoulder.rotation.z = -0.48;
    group.add(leftShoulder);

    const rightShoulder = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.44, 0.42, 6, 12),
      armorMat,
    );
    rightShoulder.position.set(1.46, 3.02, 0.02);
    rightShoulder.rotation.z = 0.48;
    group.add(rightShoulder);

    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.48, 2.96, 0.06);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 1.02, 0.62),
        obsidianMat,
      );
      upper.position.y = -0.53;
      pivot.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 10, 10),
        armorMat,
      );
      elbow.position.y = -1.12;
      pivot.add(elbow);

      const fore = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.96, 0.58),
        obsidianMat,
      );
      fore.position.y = -1.72;
      pivot.add(fore);

      const gauntlet = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.34, 0.76),
        armorMat,
      );
      gauntlet.position.y = -2.26;
      pivot.add(gauntlet);

      const clawA = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.28, 6),
        basaltMat,
      );
      clawA.position.set(side * 0.16, -2.32, 0.42);
      clawA.rotation.x = Math.PI / 2;
      pivot.add(clawA);

      const clawB = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.28, 6),
        basaltMat,
      );
      clawB.position.set(side * 0.03, -2.35, 0.45);
      clawB.rotation.x = Math.PI / 2;
      pivot.add(clawB);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.5, 0.02);

      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 1.08, 0.78),
        obsidianMat,
      );
      thigh.position.y = -0.56;
      pivot.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 10, 10),
        armorMat,
      );
      knee.position.y = -1.2;
      pivot.add(knee);

      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 1.04, 0.66),
        obsidianMat,
      );
      shin.position.y = -1.84;
      pivot.add(shin);

      const ankle = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.2, 0.52),
        armorMat,
      );
      ankle.position.set(0, -2.36, 0.03);
      pivot.add(ankle);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.74, 0.28, 1.0),
        basaltMat,
      );
      foot.position.set(0, -2.5, 0.3);
      pivot.add(foot);

      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.16, 0.24),
        basaltMat,
      );
      heel.position.set(0, -2.47, -0.28);
      pivot.add(heel);

      return pivot;
    };

    const leftLeg = createLeg(-0.58);
    const rightLeg = createLeg(0.58);
    group.add(leftLeg);
    group.add(rightLeg);

    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.09 - i * 0.012, 0.3 + i * 0.08, 6),
        basaltMat,
      );
      shard.position.set(0, 2.05 + i * 0.35, -0.72);
      shard.rotation.x = -0.34;
      group.add(shard);
    }

    const waistRune = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.03, 8, 24),
      runeMat,
    );
    waistRune.position.set(0, 1.64, 0.05);
    waistRune.rotation.x = Math.PI / 2;
    group.add(waistRune);

    group.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    group.userData.leftArm = leftArm;
    group.userData.rightArm = rightArm;
    group.userData.leftLeg = leftLeg;
    group.userData.rightLeg = rightLeg;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [glowMat, runeMat];

    group.scale.setScalar(1.02);

    return group;
  }
}

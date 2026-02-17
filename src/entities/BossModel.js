import * as THREE from "three";

export class BossModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "boss_warlord";

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x06070a,
      roughness: 0.3,
      metalness: 0.9,
      emissive: 0x010101,
      emissiveIntensity: 0.08,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x12161d,
      roughness: 0.36,
      metalness: 0.94,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x030406,
      roughness: 0.48,
      metalness: 0.75,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x39d2ff,
      emissive: 0x1786d8,
      emissiveIntensity: 2.1,
      toneMapped: false,
    });

    // Torso and core frame
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 1.25), armorMat);
    pelvis.position.y = 2.0;
    group.add(pelvis);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.35, 1.7), armorMat);
    torso.position.y = 3.35;
    group.add(torso);

    const chestPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 1.12, 1.45, 7, 1, true),
      trimMat,
    );
    chestPlate.rotation.y = Math.PI / 7;
    chestPlate.rotation.z = Math.PI / 2;
    chestPlate.position.set(0, 3.35, 1.0);
    group.add(chestPlate);

    const coreCage = new THREE.Mesh(
      new THREE.TorusGeometry(0.44, 0.1, 10, 20),
      darkTrimMat,
    );
    coreCage.rotation.x = Math.PI / 2;
    coreCage.position.set(0, 3.45, 0.96);
    group.add(coreCage);

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), glowMat);
    core.position.set(0, 3.45, 0.96);
    group.add(core);

    const leftVent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.05), glowMat);
    leftVent.position.set(-0.32, 3.35, 1.04);
    group.add(leftVent);

    const rightVent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.62, 0.05), glowMat);
    rightVent.position.set(0.32, 3.35, 1.04);
    group.add(rightVent);

    // Head / helmet
    const headGroup = new THREE.Group();
    headGroup.position.y = 5.0;
    group.add(headGroup);

    const helmet = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.1, 1.26), armorMat);
    headGroup.add(helmet);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 1.36), trimMat);
    crown.position.y = 0.55;
    headGroup.add(crown);

    const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.58, 6), darkTrimMat);
    leftHorn.position.set(-0.34, 0.62, 0.22);
    leftHorn.rotation.z = -0.28;
    leftHorn.rotation.x = -0.12;
    headGroup.add(leftHorn);

    const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.58, 6), darkTrimMat);
    rightHorn.position.set(0.34, 0.62, 0.22);
    rightHorn.rotation.z = 0.28;
    rightHorn.rotation.x = -0.12;
    headGroup.add(rightHorn);

    const jawGuard = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.86), darkTrimMat);
    jawGuard.position.set(0, -0.36, 0.2);
    headGroup.add(jawGuard);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.14, 0.1), glowMat);
    visor.position.set(0, 0.02, 0.69);
    headGroup.add(visor);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.22, 0.02, 0.73);
    headGroup.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.22, 0.02, 0.73);
    headGroup.add(rightEyeAnchor);

    // Shoulder armor
    const leftPauldron = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.54, 0.45, 6, 12),
      armorMat,
    );
    leftPauldron.position.set(-1.62, 4.08, 0);
    leftPauldron.rotation.z = -0.45;
    group.add(leftPauldron);

    const rightPauldron = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.54, 0.45, 6, 12),
      armorMat,
    );
    rightPauldron.position.set(1.62, 4.08, 0);
    rightPauldron.rotation.z = 0.45;
    group.add(rightPauldron);

    // Arms
    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.66, 4.0, 0.02);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.2, 0.74), armorMat);
      upper.position.y = -0.6;
      pivot.add(upper);

      const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.7, 10), darkTrimMat);
      elbowJoint.rotation.z = Math.PI / 2;
      elbowJoint.position.y = -1.2;
      pivot.add(elbowJoint);

      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.16, 0.68), armorMat);
      lower.position.y = -1.84;
      pivot.add(lower);

      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.42, 0.9), trimMat);
      gauntlet.position.y = -2.5;
      pivot.add(gauntlet);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.0, 0.84), trimMat);
    blade.position.set(0.5, -2.12, 0);
    blade.rotation.z = -0.08;
    rightArm.add(blade);

    // Legs and feet
    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 2.0, 0);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.28, 0.9), armorMat);
      thigh.position.y = -0.64;
      pivot.add(thigh);

      const knee = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.72, 10), darkTrimMat);
      knee.rotation.z = Math.PI / 2;
      knee.position.y = -1.3;
      pivot.add(knee);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.34, 0.78), armorMat);
      shin.position.y = -2.06;
      pivot.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.34, 1.38), trimMat);
      foot.position.set(0, -2.88, 0.27);
      pivot.add(foot);

      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.2, 0.38), darkTrimMat);
      heel.position.set(0, -2.82, -0.36);
      pivot.add(heel);

      return pivot;
    };

    const leftLeg = createLeg(-0.74);
    const rightLeg = createLeg(0.74);
    group.add(leftLeg);
    group.add(rightLeg);

    // Back fins for silhouette
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.1), darkTrimMat);
      fin.position.set(0, 3.05 + i * 0.6, -0.9);
      fin.rotation.x = -0.32;
      group.add(fin);
    }

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
    group.userData.eyeGlowMats = [glowMat];

    group.scale.setScalar(1.08);

    return group;
  }
}

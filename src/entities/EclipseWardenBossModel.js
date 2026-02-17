import * as THREE from "three";

export class EclipseWardenBossModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "eclipse_warden";

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x04060a,
      roughness: 0.34,
      metalness: 0.88,
      emissive: 0x010204,
      emissiveIntensity: 0.08,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x141b25,
      roughness: 0.42,
      metalness: 0.82,
      emissive: 0x03070d,
      emissiveIntensity: 0.12,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x0c1016,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x9ceeff,
      emissive: 0x59dfff,
      emissiveIntensity: 2.15,
      roughness: 0.14,
      metalness: 0.56,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x73ddff,
      emissive: 0x32c1ff,
      emissiveIntensity: 1.6,
      roughness: 0.22,
      metalness: 0.5,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      toneMapped: false,
    });

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.68, 1.14),
      bodyMat,
    );
    pelvis.position.y = 1.56;
    group.add(pelvis);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.98, 1.58, 1.34),
      bodyMat,
    );
    torso.position.y = 2.62;
    group.add(torso);

    const chestPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.94, 0.24),
      armorMat,
    );
    chestPlate.position.set(0, 2.64, 0.8);
    chestPlate.rotation.x = -0.08;
    group.add(chestPlate);

    const chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      glowMat,
    );
    chestCore.position.set(0, 2.66, 0.86);
    group.add(chestCore);

    const runeRings = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.31 + i * 0.12, 0.024, 8, 22),
        runeMat,
      );
      ring.position.set(0, 2.66, 0.84);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.56;
      group.add(ring);
      runeRings.push(ring);
    }

    const headPivot = new THREE.Group();
    headPivot.position.y = 3.78;
    group.add(headPivot);

    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.94, 0.88, 1.0),
      bodyMat,
    );
    headPivot.add(helm);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.15, 0.18),
      armorMat,
    );
    brow.position.set(0, 0.17, 0.5);
    headPivot.add(brow);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.11, 0.08),
      glowMat,
    );
    visor.position.set(0, 0.02, 0.58);
    headPivot.add(visor);

    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.24, 0.6),
      armorMat,
    );
    jaw.position.set(0, -0.29, 0.17);
    headPivot.add(jaw);

    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.44, 6),
      armorMat,
    );
    crest.position.set(0, 0.62, -0.05);
    crest.rotation.x = -0.16;
    headPivot.add(crest);

    const leftHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.46, 6),
      armorMat,
    );
    leftHorn.position.set(-0.31, 0.46, 0.18);
    leftHorn.rotation.set(-0.28, 0, -0.42);
    headPivot.add(leftHorn);

    const rightHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.46, 6),
      armorMat,
    );
    rightHorn.position.set(0.31, 0.46, 0.18);
    rightHorn.rotation.set(-0.28, 0, 0.42);
    headPivot.add(rightHorn);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      glowMat,
    );
    leftEye.position.set(-0.18, 0.02, 0.6);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      glowMat,
    );
    rightEye.position.set(0.18, 0.02, 0.6);
    headPivot.add(rightEye);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.18, 0.02, 0.64);
    headPivot.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.18, 0.02, 0.64);
    headPivot.add(rightEyeAnchor);

    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.44, 2.9, 0.05);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.02, 0.58),
        bodyMat,
      );
      upper.position.y = -0.53;
      pivot.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        armorMat,
      );
      elbow.position.y = -1.12;
      pivot.add(elbow);

      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.95, 0.52),
        bodyMat,
      );
      lower.position.y = -1.72;
      pivot.add(lower);

      const gauntlet = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.34, 0.68),
        armorMat,
      );
      gauntlet.position.y = -2.28;
      pivot.add(gauntlet);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.72, 0.18),
        runeMat,
      );
      blade.position.set(side * 0.2, -2.3, 0.24);
      blade.rotation.z = side * 0.24;
      pivot.add(blade);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.56, 0.03);

      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 1.02, 0.68),
        bodyMat,
      );
      thigh.position.y = -0.54;
      pivot.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 10, 10),
        armorMat,
      );
      knee.position.y = -1.14;
      pivot.add(knee);

      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.96, 0.6),
        bodyMat,
      );
      shin.position.y = -1.74;
      pivot.add(shin);

      const ankle = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.16, 0.48),
        armorMat,
      );
      ankle.position.set(0, -2.24, 0.04);
      pivot.add(ankle);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.74, 0.26, 0.96),
        armorMat,
      );
      foot.position.set(0, -2.38, 0.25);
      pivot.add(foot);

      return pivot;
    };

    const leftLeg = createLeg(-0.54);
    const rightLeg = createLeg(0.54);
    group.add(leftLeg);
    group.add(rightLeg);

    const mantlePanels = [];
    for (let i = 0; i < 8; i++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2 + Math.random() * 0.1, 0.98 + Math.random() * 0.44),
        clothMat,
      );
      const angle = (i / 8) * Math.PI * 2;
      const radius = 0.48 + Math.random() * 0.1;
      const yPos = 1.65 + Math.random() * 0.24;
      panel.position.set(
        Math.cos(angle) * radius,
        yPos,
        Math.sin(angle) * radius - 0.08,
      );
      panel.lookAt(0, yPos, 0);
      panel.userData.baseY = yPos;
      panel.userData.phase = Math.random() * Math.PI * 2;
      panel.userData.angle = angle;
      panel.userData.radius = radius;
      group.add(panel);
      mantlePanels.push(panel);
    }

    const orbitShards = [];
    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.56, 0.18),
        runeMat,
      );
      const angle = (i / 4) * Math.PI * 2;
      const radius = 0.92 + i * 0.05;
      const yPos = 2.52 + (i % 2) * 0.26;
      shard.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
      shard.userData.angle = angle;
      shard.userData.radius = radius;
      shard.userData.baseY = yPos;
      shard.userData.phase = Math.random() * Math.PI * 2;
      group.add(shard);
      orbitShards.push(shard);
    }

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 - i * 0.01, 0.32 + i * 0.08, 6),
        armorMat,
      );
      spine.position.set(0, 2.14 + i * 0.34, -0.68);
      spine.rotation.x = -0.34;
      group.add(spine);
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
    group.userData.mantlePanels = mantlePanels;
    group.userData.orbitShards = orbitShards;
    group.userData.runeRings = runeRings;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [glowMat, runeMat];

    group.scale.setScalar(0.95);

    return group;
  }
}

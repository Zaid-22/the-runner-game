import * as THREE from "three";

export class NightfangBossModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "nightfang";

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x040506,
      roughness: 0.34,
      metalness: 0.9,
      emissive: 0x010102,
      emissiveIntensity: 0.08,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x101317,
      roughness: 0.42,
      metalness: 0.82,
      emissive: 0x030406,
      emissiveIntensity: 0.1,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c10,
      roughness: 0.9,
      metalness: 0.12,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x8be6ff,
      emissive: 0x49cfff,
      emissiveIntensity: 2.05,
      roughness: 0.12,
      metalness: 0.58,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x65d7ff,
      emissive: 0x33baff,
      emissiveIntensity: 1.5,
      roughness: 0.24,
      metalness: 0.5,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
      toneMapped: false,
    });

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.66, 1.1),
      bodyMat,
    );
    pelvis.position.y = 1.5;
    group.add(pelvis);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 1.55, 1.3),
      bodyMat,
    );
    torso.position.y = 2.56;
    group.add(torso);

    const chestGuard = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.95, 0.24),
      armorMat,
    );
    chestGuard.position.set(0, 2.58, 0.76);
    chestGuard.rotation.x = -0.07;
    group.add(chestGuard);

    const chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.21, 0),
      glowMat,
    );
    chestCore.position.set(0, 2.58, 0.83);
    group.add(chestCore);

    const chestHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.03, 8, 20),
      runeMat,
    );
    chestHalo.position.set(0, 2.58, 0.81);
    chestHalo.rotation.x = Math.PI / 2;
    group.add(chestHalo);

    const headPivot = new THREE.Group();
    headPivot.position.y = 3.7;
    group.add(headPivot);

    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.84, 0.96),
      bodyMat,
    );
    headPivot.add(helm);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.11, 0.09),
      glowMat,
    );
    visor.position.set(0, 0.03, 0.55);
    headPivot.add(visor);

    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.24, 0.58),
      armorMat,
    );
    jaw.position.set(0, -0.28, 0.14);
    headPivot.add(jaw);

    const leftHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.5, 6),
      armorMat,
    );
    leftHorn.position.set(-0.3, 0.47, 0.16);
    leftHorn.rotation.set(-0.25, 0, -0.48);
    headPivot.add(leftHorn);

    const rightHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.5, 6),
      armorMat,
    );
    rightHorn.position.set(0.3, 0.47, 0.16);
    rightHorn.rotation.set(-0.25, 0, 0.48);
    headPivot.add(rightHorn);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      glowMat,
    );
    leftEye.position.set(-0.18, 0.02, 0.58);
    headPivot.add(leftEye);

    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      glowMat,
    );
    rightEye.position.set(0.18, 0.02, 0.58);
    headPivot.add(rightEye);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.18, 0.02, 0.62);
    headPivot.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.18, 0.02, 0.62);
    headPivot.add(rightEyeAnchor);

    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.4, 2.85, 0.03);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 1.0, 0.56),
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
        new THREE.BoxGeometry(0.42, 0.95, 0.52),
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
        new THREE.BoxGeometry(0.08, 0.76, 0.18),
        runeMat,
      );
      blade.position.set(side * 0.2, -2.3, 0.26);
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
      pivot.position.set(x, 1.5, 0.02);

      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.0, 0.66),
        bodyMat,
      );
      thigh.position.y = -0.52;
      pivot.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        armorMat,
      );
      knee.position.y = -1.12;
      pivot.add(knee);

      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.94, 0.58),
        bodyMat,
      );
      shin.position.y = -1.72;
      pivot.add(shin);

      const ankle = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.16, 0.46),
        armorMat,
      );
      ankle.position.set(0, -2.22, 0.04);
      pivot.add(ankle);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.26, 0.94),
        armorMat,
      );
      foot.position.set(0, -2.36, 0.24);
      pivot.add(foot);

      return pivot;
    };

    const leftLeg = createLeg(-0.52);
    const rightLeg = createLeg(0.52);
    group.add(leftLeg);
    group.add(rightLeg);

    const capePanels = [];
    for (let i = 0; i < 7; i++) {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.22 + Math.random() * 0.1, 0.96 + Math.random() * 0.45),
        clothMat,
      );
      const angle = THREE.MathUtils.lerp(-0.65, 0.65, i / 6);
      const radius = 0.46 + Math.random() * 0.12;
      const y = 1.7 + Math.random() * 0.2;
      panel.position.set(Math.sin(angle) * radius, y, -0.52 - Math.cos(angle) * 0.18);
      panel.rotation.y = Math.PI + angle * 0.55;
      panel.userData.baseY = y;
      panel.userData.phase = Math.random() * Math.PI * 2;
      panel.userData.angle = angle;
      panel.userData.radius = radius;
      group.add(panel);
      capePanels.push(panel);
    }

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 - i * 0.01, 0.32 + i * 0.07, 6),
        armorMat,
      );
      spine.position.set(0, 2.15 + i * 0.32, -0.66);
      spine.rotation.x = -0.34;
      group.add(spine);
    }

    const runeHalo = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.52 + i * 0.13, 0.02, 8, 24),
        runeMat,
      );
      ring.position.set(0, 1.72, 0.03);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.52;
      group.add(ring);
      runeHalo.push(ring);
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
    group.userData.capePanels = capePanels;
    group.userData.runeRings = runeHalo;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [glowMat, runeMat];

    group.scale.setScalar(0.96);

    return group;
  }
}

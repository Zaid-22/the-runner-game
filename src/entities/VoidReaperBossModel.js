import * as THREE from "three";

export class VoidReaperBossModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "void_reaper";

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x05080f,
      roughness: 0.34,
      metalness: 0.88,
      emissive: 0x010306,
      emissiveIntensity: 0.08,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x121b29,
      roughness: 0.4,
      metalness: 0.84,
      emissive: 0x030915,
      emissiveIntensity: 0.12,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x101620,
      transparent: true,
      opacity: 0.88,
      roughness: 0.92,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x050a14,
      emissiveIntensity: 0.18,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x9ef4ff,
      emissive: 0x4fdfff,
      emissiveIntensity: 2.15,
      roughness: 0.15,
      metalness: 0.6,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x68d9ff,
      emissive: 0x38c8ff,
      emissiveIntensity: 1.4,
      roughness: 0.22,
      metalness: 0.5,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      toneMapped: false,
    });

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.62, 1.04),
      obsidianMat,
    );
    pelvis.position.y = 1.46;
    group.add(pelvis);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, 1.42, 1.22),
      obsidianMat,
    );
    torso.position.y = 2.42;
    group.add(torso);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.9, 0.22),
      armorMat,
    );
    chest.position.set(0, 2.42, 0.74);
    chest.rotation.x = -0.08;
    group.add(chest);

    const chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      glowMat,
    );
    chestCore.position.set(0, 2.45, 0.8);
    group.add(chestCore);

    const runeRings = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.28 + i * 0.1, 0.026, 8, 22),
        runeMat,
      );
      ring.position.set(0, 2.46, 0.78);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = i * 0.72;
      group.add(ring);
      runeRings.push(ring);
    }

    const headPivot = new THREE.Group();
    headPivot.position.y = 3.48;
    group.add(headPivot);

    const hood = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      clothMat,
    );
    hood.position.set(0, 0.2, 0.02);
    hood.rotation.x = Math.PI;
    hood.scale.set(1.0, 1.34, 1.16);
    headPivot.add(hood);

    const faceMask = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.56, 0.28),
      armorMat,
    );
    faceMask.position.set(0, 0.02, 0.42);
    headPivot.add(faceMask);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.11, 0.08),
      glowMat,
    );
    visor.position.set(0, 0.07, 0.56);
    headPivot.add(visor);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.14, 0.05, 0.59);
    headPivot.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.14, 0.05, 0.59);
    headPivot.add(rightEyeAnchor);

    const crest = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.42, 6),
      armorMat,
    );
    crest.position.set(0, 0.73, -0.06);
    crest.rotation.x = -0.2;
    headPivot.add(crest);

    const createArm = (side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.34, 2.72, 0.04);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.92, 0.54),
        obsidianMat,
      );
      upper.position.y = -0.5;
      pivot.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 10, 10),
        armorMat,
      );
      elbow.position.y = -1.04;
      pivot.add(elbow);

      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.86, 0.5),
        obsidianMat,
      );
      lower.position.y = -1.58;
      pivot.add(lower);

      const hand = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.28, 0.6),
        armorMat,
      );
      hand.position.y = -2.05;
      pivot.add(hand);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.64, 0.24),
        runeMat,
      );
      blade.position.set(side * 0.22, -2.08, 0.24);
      blade.rotation.z = side * 0.25;
      pivot.add(blade);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.46, 0.02);

      const thigh = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.96, 0.62),
        obsidianMat,
      );
      thigh.position.y = -0.5;
      pivot.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        armorMat,
      );
      knee.position.y = -1.04;
      pivot.add(knee);

      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.9, 0.56),
        obsidianMat,
      );
      shin.position.y = -1.62;
      pivot.add(shin);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.24, 0.9),
        armorMat,
      );
      foot.position.set(0, -2.1, 0.23);
      pivot.add(foot);

      const heel = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.14, 0.2),
        obsidianMat,
      );
      heel.position.set(0, -2.07, -0.25);
      pivot.add(heel);

      return pivot;
    };

    const leftLeg = createLeg(-0.48);
    const rightLeg = createLeg(0.48);
    group.add(leftLeg);
    group.add(rightLeg);

    const cloakStrips = [];
    for (let i = 0; i < 9; i++) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16 + Math.random() * 0.08, 0.9 + Math.random() * 0.55),
        clothMat,
      );
      const angle = (i / 9) * Math.PI * 2;
      const radius = 0.4 + Math.random() * 0.14;
      const yPos = 1.35 + Math.random() * 0.3;
      strip.position.set(
        Math.cos(angle) * radius,
        yPos,
        Math.sin(angle) * radius,
      );
      strip.lookAt(0, yPos, 0);
      strip.userData.baseY = yPos;
      strip.userData.phase = Math.random() * Math.PI * 2;
      strip.userData.angle = angle;
      strip.userData.radius = radius;
      group.add(strip);
      cloakStrips.push(strip);
    }

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 - i * 0.012, 0.3 + i * 0.08, 6),
        armorMat,
      );
      spine.position.set(0, 2.1 + i * 0.34, -0.58);
      spine.rotation.x = -0.32;
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
    group.userData.cloakStrips = cloakStrips;
    group.userData.runeRings = runeRings;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [glowMat, runeMat];

    group.scale.setScalar(0.98);

    return group;
  }
}

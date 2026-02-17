import * as THREE from "three";

export class RiftJudicatorBossModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "rift_judicator";

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x04070c,
      roughness: 0.33,
      metalness: 0.88,
      emissive: 0x010205,
      emissiveIntensity: 0.08,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x131a24,
      roughness: 0.42,
      metalness: 0.82,
      emissive: 0x03070f,
      emissiveIntensity: 0.12,
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x0c1218,
      roughness: 0.92,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x91ecff,
      emissive: 0x55d8ff,
      emissiveIntensity: 2.1,
      roughness: 0.14,
      metalness: 0.56,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x6adaff,
      emissive: 0x2eb6ff,
      emissiveIntensity: 1.55,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      toneMapped: false,
    });

    const pelvis = new THREE.Mesh(
      new THREE.BoxGeometry(1.58, 0.66, 1.1),
      bodyMat,
    );
    pelvis.position.y = 1.54;
    group.add(pelvis);

    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 1.54, 1.3),
      bodyMat,
    );
    torso.position.y = 2.58;
    group.add(torso);

    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.92, 0.24),
      armorMat,
    );
    chest.position.set(0, 2.6, 0.78);
    chest.rotation.x = -0.07;
    group.add(chest);

    const chestCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      glowMat,
    );
    chestCore.position.set(0, 2.62, 0.84);
    group.add(chestCore);

    const runeRings = [];
    for (let i = 0; i < 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3 + i * 0.12, 0.024, 8, 22),
        runeMat,
      );
      ring.position.set(0, 2.62, 0.82);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.z = i * 0.58;
      group.add(ring);
      runeRings.push(ring);
    }

    const headPivot = new THREE.Group();
    headPivot.position.y = 3.72;
    group.add(headPivot);

    const helm = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.86, 0.98),
      bodyMat,
    );
    headPivot.add(helm);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.15, 0.18),
      armorMat,
    );
    brow.position.set(0, 0.17, 0.48);
    headPivot.add(brow);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.1, 0.08),
      glowMat,
    );
    visor.position.set(0, 0.02, 0.56);
    headPivot.add(visor);

    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.24, 0.56),
      armorMat,
    );
    jaw.position.set(0, -0.28, 0.16);
    headPivot.add(jaw);

    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.42, 6),
      armorMat,
    );
    crown.position.set(0, 0.6, -0.04);
    crown.rotation.x = -0.18;
    headPivot.add(crown);

    const leftHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.44, 6),
      armorMat,
    );
    leftHorn.position.set(-0.3, 0.45, 0.16);
    leftHorn.rotation.set(-0.28, 0, -0.44);
    headPivot.add(leftHorn);

    const rightHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.44, 6),
      armorMat,
    );
    rightHorn.position.set(0.3, 0.45, 0.16);
    rightHorn.rotation.set(-0.28, 0, 0.44);
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
      pivot.position.set(side * 1.4, 2.84, 0.05);

      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 1.0, 0.56),
        bodyMat,
      );
      upper.position.y = -0.52;
      pivot.add(upper);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 10, 10),
        armorMat,
      );
      elbow.position.y = -1.1;
      pivot.add(elbow);

      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.92, 0.5),
        bodyMat,
      );
      lower.position.y = -1.68;
      pivot.add(lower);

      const gauntlet = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.32, 0.66),
        armorMat,
      );
      gauntlet.position.y = -2.22;
      pivot.add(gauntlet);

      const edge = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.7, 0.16),
        runeMat,
      );
      edge.position.set(side * 0.2, -2.24, 0.24);
      edge.rotation.z = side * 0.24;
      pivot.add(edge);

      return pivot;
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    group.add(leftArm);
    group.add(rightArm);

    const createLeg = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 1.54, 0.02);

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
      knee.position.y = -1.1;
      pivot.add(knee);

      const shin = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.94, 0.58),
        bodyMat,
      );
      shin.position.y = -1.68;
      pivot.add(shin);

      const ankle = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.16, 0.48),
        armorMat,
      );
      ankle.position.set(0, -2.18, 0.04);
      pivot.add(ankle);

      const foot = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.26, 0.94),
        armorMat,
      );
      foot.position.set(0, -2.32, 0.24);
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
        new THREE.PlaneGeometry(0.22 + Math.random() * 0.08, 0.96 + Math.random() * 0.44),
        clothMat,
      );
      const angle = THREE.MathUtils.lerp(-0.64, 0.64, i / 6);
      const radius = 0.46 + Math.random() * 0.1;
      const yPos = 1.68 + Math.random() * 0.22;
      panel.position.set(Math.sin(angle) * radius, yPos, -0.54 - Math.cos(angle) * 0.18);
      panel.rotation.y = Math.PI + angle * 0.58;
      panel.userData.baseY = yPos;
      panel.userData.phase = Math.random() * Math.PI * 2;
      panel.userData.angle = angle;
      panel.userData.radius = radius;
      group.add(panel);
      capePanels.push(panel);
    }

    const wingBlades = [];
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.68, 0.22),
        runeMat,
      );
      const side = i < 2 ? -1 : 1;
      const row = i % 2;
      blade.position.set(side * (0.72 + row * 0.22), 2.36 + row * 0.5, -0.48);
      blade.userData.side = side;
      blade.userData.phase = Math.random() * Math.PI * 2;
      blade.userData.baseX = blade.position.x;
      blade.userData.baseY = blade.position.y;
      blade.userData.baseZ = blade.position.z;
      group.add(blade);
      wingBlades.push(blade);
    }

    for (let i = 0; i < 3; i++) {
      const spine = new THREE.Mesh(
        new THREE.ConeGeometry(0.08 - i * 0.01, 0.3 + i * 0.08, 6),
        armorMat,
      );
      spine.position.set(0, 2.1 + i * 0.34, -0.66);
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
    group.userData.capePanels = capePanels;
    group.userData.wingBlades = wingBlades;
    group.userData.runeRings = runeRings;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [glowMat, runeMat];

    group.scale.setScalar(0.95);

    return group;
  }
}

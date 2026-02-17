import * as THREE from "three";

function sculptCloak(geometry, { ripple = 0.08, rippleFreq = 6.0, twist = 0.18 } = {}) {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z);
    const lowerInfluence = THREE.MathUtils.clamp((-y + 0.95) / 1.8, 0, 1);
    const waveA = Math.sin(angle * rippleFreq + y * 2.2) * ripple * lowerInfluence;
    const waveB = Math.cos(angle * (rippleFreq * 0.5) - y * 3.3) * ripple * 0.46 * lowerInfluence;
    const spiral = twist * lowerInfluence * lowerInfluence;
    const finalRadius = radius + waveA + waveB;
    const finalAngle = angle + spiral;

    pos.setXYZ(
      i,
      Math.cos(finalAngle) * finalRadius,
      y,
      Math.sin(finalAngle) * finalRadius,
    );
  }
  geometry.computeVertexNormals();
}

function createTornStripGeometry(width, height) {
  const geo = new THREE.PlaneGeometry(width, height, 1, 7);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const yNorm = THREE.MathUtils.clamp((y + height * 0.5) / height, 0, 1);
    const edgeNoise = (Math.random() - 0.5) * 0.06;
    const taper = (1 - yNorm) * 0.1;
    pos.setX(i, pos.getX(i) * (1 - taper) + edgeNoise * yNorm);
  }
  geo.computeVertexNormals();
  return geo;
}

export class SpecterModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "specter";

    const cloakOuterMat = new THREE.MeshStandardMaterial({
      color: 0x2e3646,
      transparent: true,
      opacity: 0.76,
      roughness: 0.9,
      metalness: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x101725,
      emissiveIntensity: 0.32,
    });
    const cloakInnerMat = new THREE.MeshStandardMaterial({
      color: 0x171d29,
      transparent: true,
      opacity: 0.66,
      roughness: 0.92,
      metalness: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x0a101a,
      emissiveIntensity: 0.2,
    });
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x0f1319,
      transparent: true,
      opacity: 0.9,
      roughness: 0.96,
      metalness: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x06090e,
      emissiveIntensity: 0.18,
    });
    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xa0a7b2,
      roughness: 0.76,
      metalness: 0.06,
      emissive: 0x1d2634,
      emissiveIntensity: 0.12,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xb4ffff,
      emissive: 0x62dcff,
      emissiveIntensity: 1.6,
      roughness: 0.22,
      metalness: 0.1,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      toneMapped: false,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xe0ffff,
      emissive: 0x8df7ff,
      emissiveIntensity: 2.4,
      roughness: 0.1,
      metalness: 0.25,
      toneMapped: false,
    });
    const wispMat = new THREE.MeshStandardMaterial({
      color: 0x9db7d1,
      transparent: true,
      opacity: 0.24,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
      depthWrite: false,
      emissive: 0x182a3f,
      emissiveIntensity: 0.2,
      toneMapped: false,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x9cf3ff,
      emissive: 0x57d3ff,
      emissiveIntensity: 1.1,
      roughness: 0.2,
      metalness: 0.35,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
      toneMapped: false,
    });

    // Soul core and rib cage.
    const coreColumn = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 1.25, 6, 12),
      coreMat,
    );
    coreColumn.position.set(0, 1.18, 0.02);
    group.add(coreColumn);

    const heart = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.15, 0),
      coreMat,
    );
    heart.position.set(0, 1.3, 0.12);
    group.add(heart);

    const ribRingA = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.02, 8, 22),
      boneMat,
    );
    ribRingA.position.set(0, 1.38, 0.04);
    ribRingA.rotation.x = Math.PI / 2;
    group.add(ribRingA);

    const ribRingB = new THREE.Mesh(
      new THREE.TorusGeometry(0.31, 0.018, 8, 22),
      boneMat,
    );
    ribRingB.position.set(0, 1.16, 0.01);
    ribRingB.rotation.x = Math.PI / 2;
    group.add(ribRingB);

    // Hood and head silhouette.
    const hoodShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.64),
      hoodMat,
    );
    hoodShell.position.set(0, 1.98, 0);
    hoodShell.rotation.x = Math.PI;
    hoodShell.scale.set(1.06, 1.5, 1.24);
    group.add(hoodShell);

    const hoodBack = new THREE.Mesh(
      new THREE.ConeGeometry(0.43, 0.86, 18, 1, true),
      cloakInnerMat,
    );
    hoodBack.position.set(0, 1.73, -0.18);
    hoodBack.rotation.x = Math.PI;
    group.add(hoodBack);

    const cowlRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.055, 10, 30),
      cloakInnerMat,
    );
    cowlRing.position.set(0, 1.55, 0.08);
    cowlRing.rotation.x = Math.PI / 2;
    group.add(cowlRing);

    const faceVoid = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x020305 }),
    );
    faceVoid.position.set(0, 1.86, 0.29);
    group.add(faceVoid);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.08),
      boneMat,
    );
    brow.position.set(0, 1.94, 0.29);
    group.add(brow);

    const jaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.06, 0.09),
      boneMat,
    );
    jaw.position.set(0, 1.77, 0.31);
    group.add(jaw);

    const leftEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      eyeMat,
    );
    leftEye.position.set(-0.09, 1.88, 0.34);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      eyeMat,
    );
    rightEye.position.set(0.09, 1.88, 0.34);
    group.add(rightEye);

    const leftEyeAnchor = new THREE.Object3D();
    leftEyeAnchor.position.set(-0.09, 1.88, 0.35);
    group.add(leftEyeAnchor);

    const rightEyeAnchor = new THREE.Object3D();
    rightEyeAnchor.position.set(0.09, 1.88, 0.35);
    group.add(rightEyeAnchor);

    // Main layered cloak.
    const outerCloakGeo = new THREE.CylinderGeometry(0.24, 0.78, 2.25, 26, 18, true);
    sculptCloak(outerCloakGeo, { ripple: 0.09, rippleFreq: 6.5, twist: 0.21 });
    const outerCloak = new THREE.Mesh(outerCloakGeo, cloakOuterMat);
    outerCloak.position.y = 0.92;
    group.add(outerCloak);

    const innerCloakGeo = new THREE.CylinderGeometry(0.16, 0.58, 1.96, 22, 14, true);
    sculptCloak(innerCloakGeo, { ripple: 0.06, rippleFreq: 5.2, twist: 0.12 });
    const innerCloak = new THREE.Mesh(innerCloakGeo, cloakInnerMat);
    innerCloak.position.y = 0.98;
    group.add(innerCloak);

    const mantle = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.07, 10, 28),
      cloakInnerMat,
    );
    mantle.position.set(0, 1.43, 0.02);
    mantle.rotation.x = Math.PI / 2;
    group.add(mantle);

    const tailGeo = new THREE.ConeGeometry(0.2, 1.95, 16, 12, true);
    const tailPos = tailGeo.attributes.position;
    for (let i = 0; i < tailPos.count; i++) {
      const y = tailPos.getY(i);
      const x = tailPos.getX(i);
      const z = tailPos.getZ(i);
      const sway = Math.sin(y * 3.1) * 0.05;
      tailPos.setXYZ(i, x + sway, y, z);
    }
    tailGeo.computeVertexNormals();
    const tail = new THREE.Mesh(tailGeo, cloakOuterMat);
    tail.position.y = 0.16;
    tail.rotation.x = Math.PI;
    group.add(tail);

    // Torn strips around the body.
    const tatters = [];
    const tatterCount = 12;
    for (let i = 0; i < tatterCount; i++) {
      const width = 0.1 + Math.random() * 0.1;
      const height = 0.5 + Math.random() * 0.52;
      const tatter = new THREE.Mesh(
        createTornStripGeometry(width, height),
        cloakOuterMat,
      );
      const angle = (i / tatterCount) * Math.PI * 2 + Math.random() * 0.2;
      const radius = 0.34 + Math.random() * 0.2;
      const yPos = 0.56 + Math.random() * 0.5;
      tatter.position.set(
        Math.cos(angle) * radius,
        yPos,
        Math.sin(angle) * radius,
      );
      tatter.lookAt(0, yPos, 0);
      tatter.userData.angle = angle;
      tatter.userData.rotSpeed = 0.2 + Math.random() * 0.35;
      tatter.userData.radius = radius;
      tatter.userData.baseY = yPos;
      tatter.userData.sway = Math.random() * Math.PI * 2;
      group.add(tatter);
      tatters.push(tatter);
    }

    // Orbiting wisps.
    const wisps = [];
    const wispCount = 5;
    for (let i = 0; i < wispCount; i++) {
      const wispGroup = new THREE.Group();
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + Math.random() * 0.028, 12, 10),
        wispMat,
      );
      wispGroup.add(orb);

      const trail = new THREE.Mesh(
        new THREE.PlaneGeometry(0.11, 0.34),
        wispMat,
      );
      trail.position.y = -0.2;
      trail.rotation.x = -0.22;
      wispGroup.add(trail);

      const phase = Math.random() * Math.PI * 2;
      const orbitRadius = 0.34 + Math.random() * 0.1;
      const orbitAngle = (i / wispCount) * Math.PI * 2;
      const baseY = 1.14 + Math.random() * 0.35;
      wispGroup.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        baseY,
        Math.sin(orbitAngle) * orbitRadius,
      );
      wispGroup.userData.rotSpeed = 0.16 + Math.random() * 0.22;
      wispGroup.userData.phase = phase;
      wispGroup.userData.orbitRadius = orbitRadius;
      wispGroup.userData.orbitAngle = orbitAngle;
      wispGroup.userData.baseY = baseY;

      group.add(wispGroup);
      wisps.push(wispGroup);
    }

    // Arcane runes circling the chest.
    const runeRings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.2 + i * 0.07, 0.009, 8, 24),
        runeMat,
      );
      ring.position.set(0, 1.08 + i * 0.19, 0.06);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = i * 0.7;
      group.add(ring);
      runeRings.push(ring);
    }

    group.traverse((child) => {
      if (!child.isMesh) return;
      const mat = child.material;
      if (mat && mat.transparent) {
        child.castShadow = false;
        child.receiveShadow = false;
      } else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    group.userData.tatters = tatters;
    group.userData.wisps = wisps;
    group.userData.runeRings = runeRings;
    group.userData.eyeAnchors = [leftEyeAnchor, rightEyeAnchor];
    group.userData.eyeGlowMats = [eyeMat, coreMat, wispMat, runeMat];

    return group;
  }
}

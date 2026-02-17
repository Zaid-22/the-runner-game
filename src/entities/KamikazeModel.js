import * as THREE from "three";

export class KamikazeModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "kamikaze";

    // MATERIALS
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      roughness: 0.4,
      metalness: 0.1,
      emissive: 0x550000,
      emissiveIntensity: 0.5,
    });

    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0x220000,
      roughness: 0.9,
    });

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });

    // 1. BODY (Unstable Sphere)
    const bodyGeo = new THREE.IcosahedronGeometry(0.5, 4); // High detail for displacement
    // Store original positions for pulsing animation in Enemy.js if we wanted
    // For now, static displacement
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Bubble effect
      const noise = Math.sin(x * 5 + y * 5) * 0.1;
      const dist = 1.0 + noise;
      pos.setXYZ(i, x * dist, y * dist, z * dist);
    }
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.y = 0.6;
    group.add(body);

    // 2. SPIKES (Protruding)
    const spikeGeo = new THREE.ConeGeometry(0.05, 0.4, 8);
    spikeGeo.translate(0, 0.2, 0);
    spikeGeo.rotateX(Math.PI / 2);

    // Random spikes on surface
    for (let i = 0; i < 12; i++) {
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      // Random dir
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.5;

      spike.position.setFromSphericalCoords(radius, phi, theta);
      spike.lookAt(0, 0, 0); // Point inward...
      spike.rotateX(Math.PI); // ...flip to point outward

      body.add(spike);
    }

    // 3. GLOWING CRACKS (Inner Sphere scaling logic)
    // We put a slightly smaller bright sphere inside.
    // If we use BackSide on body it works, but here we just let it clip or use it as a 'core'
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.35, 1),
      coreMat,
    );
    body.add(core); // Inside body

    // 4. LEGS (Scuttlers)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.01, 0.4, 6);
    legGeo.translate(0, 0.2, 0);

    // 6 tiny legs
    for (let i = 0; i < 6; i++) {
      const leg = new THREE.Mesh(legGeo, skinMat);
      const angle = (i / 6) * Math.PI * 2;
      leg.position.set(Math.cos(angle) * 0.3, -0.4, Math.sin(angle) * 0.3);
      leg.rotation.z = Math.PI; // Point down
      leg.rotation.x = 0.5; // Splay out
      leg.lookAt(Math.cos(angle) * 1, -1, Math.sin(angle) * 1);
      body.add(leg);
    }

    // Store for animation
    group.userData.core = core;

    return group;
  }
}

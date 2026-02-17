import * as THREE from "three";

export class ArachnidModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "arachnid";

    // MATERIALS
    // Organic, shiny chitin material
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a0505, // Blackish Red
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x220000,
      emissiveIntensity: 0.2,
    });

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a, // Dark Grey
      roughness: 0.5,
      metalness: 0.4,
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 5.0,
      toneMapped: false,
    });

    // 1. HEAD (Cephalothorax)
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    // Deform head slightly
    const posAttribute = headGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const y = posAttribute.getY(i);
      const z = posAttribute.getZ(i);
      // Flatten
      posAttribute.setY(i, y * 0.6);
    }
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.z = 0.2;
    group.add(head);

    // EYES (Cluster)
    const eyePositions = [
      [-0.08, 0.1, 0.25],
      [0.08, 0.1, 0.25], // Main
      [-0.15, 0.05, 0.2],
      [0.15, 0.05, 0.2], // Side
      [-0.05, 0.15, 0.2],
      [0.05, 0.15, 0.2], // Top
    ];

    eyePositions.forEach((pos) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
      eye.position.set(...pos);
      head.add(eye);
    });

    // MANDIBLES
    const mandibleGeo = new THREE.ConeGeometry(0.05, 0.3, 8);
    mandibleGeo.rotateX(Math.PI / 2);
    const leftMan = new THREE.Mesh(mandibleGeo, legMat);
    leftMan.position.set(-0.1, -0.1, 0.35);
    leftMan.rotation.y = -0.5;
    head.add(leftMan);

    const rightMan = new THREE.Mesh(mandibleGeo, legMat);
    rightMan.position.set(0.1, -0.1, 0.35);
    rightMan.rotation.y = 0.5;
    head.add(rightMan);

    // 2. ABDOMEN (Back body)
    const abdomenGeo = new THREE.SphereGeometry(0.5, 32, 32);
    // Vertex Displacement for "Lumpy" Sac look
    const abPos = abdomenGeo.attributes.position;
    for (let i = 0; i < abPos.count; i++) {
      const x = abPos.getX(i);
      const y = abPos.getY(i);
      const z = abPos.getZ(i);
      // Noise-like simple displacement
      const noise = Math.sin(x * 10) * Math.cos(y * 10) * 0.05;
      abPos.setXYZ(i, x + x * noise, y + y * noise, z + z * noise * 1.5); // Elongate Z
    }
    abdomenGeo.computeVertexNormals();

    const abdomen = new THREE.Mesh(abdomenGeo, bodyMat);
    abdomen.position.set(0, 0.1, -0.6);
    abdomen.scale.set(1, 0.8, 1.3);
    group.add(abdomen);

    // 3. LEGS (Procedural Segments)
    const legs = [];
    const legCount = 8;
    for (let i = 0; i < legCount; i++) {
      const side = i % 2 === 0 ? 1 : -1; // Left/Right
      const indexRatio = Math.floor(i / 2) / 3; // 0 to 1 along body

      const pivot = new THREE.Group();
      // Position along cephalothorax
      pivot.position.set(side * 0.2, 0, 0.2 - indexRatio * 0.4);
      // Initial Rotation fan-out
      pivot.rotation.y = side * (0.5 + indexRatio * 1.5);

      // Femur (Upper Leg)
      const femurGeo = new THREE.CylinderGeometry(0.05, 0.03, 0.6, 8);
      femurGeo.rotateZ(Math.PI / 2); // Lay flat X
      femurGeo.translate(0.3, 0, 0); // Pivot at edge
      const femur = new THREE.Mesh(femurGeo, legMat);
      femur.rotation.z = side * 0.5; // Upwards
      pivot.add(femur);

      // Tibia (Lower Leg)
      const tibiaGeo = new THREE.CylinderGeometry(0.03, 0.01, 0.8, 8);
      tibiaGeo.rotateZ(Math.PI / 2);
      tibiaGeo.translate(0.4, 0, 0);
      const tibia = new THREE.Mesh(tibiaGeo, legMat);
      tibia.position.set(0.6 * side, 0, 0); // End of femur
      tibia.rotation.z = -side * 1.2; // Angle down sharp
      femur.add(tibia);

      group.add(pivot);
      legs.push({ pivot, femur, tibia, baseRot: pivot.rotation.y });
    }

    group.userData.legs = legs; // For animation in Enemy.js

    // Scale entire spider up slightly
    group.scale.setScalar(1.2);

    return group;
  }
}

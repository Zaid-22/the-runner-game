import * as THREE from "three";

export class HarpyModel {
  static createMesh() {
    const group = new THREE.Group();
    group.userData.type = "harpy";

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.7,
      metalness: 0.3,
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // 1. BODY (Streamlined)
    // Deformed sphere
    const bodyGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) pos.setY(i, y * 1.5); // Elongated tail
    }
    bodyGeo.computeVertexNormals();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // 2. HEAD
    const headGeo = new THREE.ConeGeometry(0.2, 0.6, 8);
    headGeo.rotateX(-Math.PI / 2);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.z = 0.5;
    group.add(head);

    // Eyes
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat);
    leftEye.position.set(-0.1, 0.1, 0.2);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05), eyeMat);
    rightEye.position.set(0.1, 0.1, 0.2);
    head.add(rightEye);

    // 3. WINGS (Extruded Shape)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(1.5, 0.5); // Tip
    wingShape.bezierCurveTo(1.2, 0, 0.8, -0.5, 0, -0.2); // Trailing edge curve

    const extrudeSettings = {
      steps: 2,
      depth: 0.05,
      bevelEnabled: false,
    };

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

    // Wings Container for Animation
    const wings = new THREE.Group();
    body.add(wings); // Attach to body so they rotate with it

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-0.2, 0, 0);
    leftWing.rotation.x = Math.PI / 2; // Flat
    leftWing.rotation.y = Math.PI; // Flip for left
    wings.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0.2, 0, 0);
    rightWing.rotation.x = Math.PI / 2;
    wings.add(rightWing);

    group.userData.wings = { left: leftWing, right: rightWing };

    return group;
  }
}

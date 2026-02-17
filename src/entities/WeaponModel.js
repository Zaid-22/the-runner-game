import * as THREE from "three";

export class WeaponModel {
  constructor(camera) {
    this.camera = camera;

    this.currentType = "hitscan";
    this.basePos = new THREE.Vector3(0.26, -0.31, -0.56);
    this.swayPos = new THREE.Vector3(0, 0, 0);
    this.recoilOffset = new THREE.Vector3(0, 0, 0);
    this.zeroVec = new THREE.Vector3();
    this.time = 0;
    this.materials = this.createMaterials();
    this.init();
  }

  createMaterials() {
    return {
      bluedSteel: new THREE.MeshStandardMaterial({
        color: 0x161d27,
        metalness: 0.95,
        roughness: 0.2,
      }),
      steel: new THREE.MeshStandardMaterial({
        color: 0x384351,
        metalness: 0.85,
        roughness: 0.28,
      }),
      polymer: new THREE.MeshStandardMaterial({
        color: 0x10151b,
        metalness: 0.32,
        roughness: 0.72,
      }),
      darkPolymer: new THREE.MeshStandardMaterial({
        color: 0x080b0f,
        metalness: 0.2,
        roughness: 0.84,
      }),
      tanPolymer: new THREE.MeshStandardMaterial({
        color: 0x4c3d2f,
        metalness: 0.18,
        roughness: 0.75,
      }),
      walnut: new THREE.MeshStandardMaterial({
        color: 0x58361f,
        metalness: 0.06,
        roughness: 0.8,
      }),
      rubber: new THREE.MeshStandardMaterial({
        color: 0x090c11,
        metalness: 0.12,
        roughness: 0.92,
      }),
      brass: new THREE.MeshStandardMaterial({
        color: 0xb58f4d,
        metalness: 0.86,
        roughness: 0.24,
      }),
      opticGlass: new THREE.MeshStandardMaterial({
        color: 0x7dc4ff,
        emissive: 0x2a5f8b,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.08,
        transparent: true,
        opacity: 0.84,
      }),
      sleeve: new THREE.MeshStandardMaterial({
        color: 0x232d3c,
        metalness: 0.12,
        roughness: 0.82,
      }),
      sleeveDark: new THREE.MeshStandardMaterial({
        color: 0x171f2a,
        metalness: 0.14,
        roughness: 0.8,
      }),
      glove: new THREE.MeshStandardMaterial({
        color: 0x12161d,
        metalness: 0.16,
        roughness: 0.9,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: 0x5f6e86,
        metalness: 0.48,
        roughness: 0.44,
      }),
    };
  }

  init() {
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.userData.noBulletBlock = true;
    this.camera.add(this.weaponGroup);
    this.weaponGroup.renderOrder = 999;

    this.createPistol();
    this.createShotgun();
    this.createRocketLauncher();

    this.weaponGroup.position.copy(this.basePos);
    this.updateWeapon("hitscan");

    this.weaponGroup.traverse((child) => {
      child.userData.noBulletBlock = true;
      if (child.isMesh) {
        child.frustumCulled = false;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  createArm(gripPosition, gripRotation, withShoulderPlate = false) {
    const { sleeve, sleeveDark, glove, accent, steel } = this.materials;

    const arm = new THREE.Group();
    arm.position.copy(gripPosition);
    if (gripRotation) arm.rotation.copy(gripRotation);
    arm.userData.isWeaponArm = true;

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 12, 10),
      glove,
    );
    hand.scale.set(1.2, 0.8, 1.45);
    arm.add(hand);

    const handTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.018, 0.07),
      accent,
    );
    handTop.position.set(0, 0.018, 0.014);
    arm.add(handTop);

    const wristBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.03, 0.035, 10),
      steel,
    );
    wristBand.rotation.x = Math.PI / 2;
    wristBand.position.set(0, -0.028, 0.05);
    arm.add(wristBand);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.034, 0.2, 5, 10),
      sleeve,
    );
    forearm.position.set(0, -0.14, 0.12);
    forearm.rotation.x = -0.35;
    arm.add(forearm);

    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 10, 10),
      sleeveDark,
    );
    elbow.position.set(0, -0.25, 0.2);
    arm.add(elbow);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.039, 0.22, 5, 10),
      sleeveDark,
    );
    upper.position.set(0, -0.39, 0.31);
    upper.rotation.x = -0.5;
    arm.add(upper);

    if (withShoulderPlate) {
      const shoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.06, 0.075),
        accent,
      );
      shoulder.position.set(0, -0.55, 0.43);
      arm.add(shoulder);
    }

    return arm;
  }

  attachWeaponArms(parent, {
    rightGrip,
    rightRot,
    leftGrip,
    leftRot,
  }) {
    if (rightGrip) {
      const rightArm = this.createArm(
        rightGrip,
        rightRot || new THREE.Euler(-0.8, 0.12, -0.22),
        true,
      );
      parent.add(rightArm);
    }
    if (leftGrip) {
      const leftArm = this.createArm(
        leftGrip,
        leftRot || new THREE.Euler(-0.86, -0.12, 0.24),
        false,
      );
      parent.add(leftArm);
    }
  }

  createPistol() {
    // This is the default hitscan rifle silhouette.
    this.pistol = new THREE.Group();
    const {
      bluedSteel,
      steel,
      polymer,
      darkPolymer,
      tanPolymer,
      opticGlass,
      brass,
    } = this.materials;

    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.094, 0.084, 0.35),
      bluedSteel,
    );
    upper.position.set(0, 0.046, -0.09);
    this.pistol.add(upper);

    this.pistolSlide = new THREE.Group();

    const boltCarrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.066, 0.05, 0.205),
      steel,
    );
    boltCarrier.position.set(0, 0.058, 0.0);
    this.pistolSlide.add(boltCarrier);

    const chargingHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.0055, 0.05, 8),
      steel,
    );
    chargingHandle.rotation.z = Math.PI / 2;
    chargingHandle.position.set(-0.038, 0.058, 0.02);
    this.pistolSlide.add(chargingHandle);

    const ejectionPort = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.014, 0.09),
      darkPolymer,
    );
    ejectionPort.position.set(-0.024, 0.07, -0.01);
    this.pistolSlide.add(ejectionPort);

    this.pistol.add(this.pistolSlide);

    const lower = new THREE.Mesh(
      new THREE.BoxGeometry(0.094, 0.09, 0.24),
      polymer,
    );
    lower.position.set(0, -0.014, 0.1);
    this.pistol.add(lower);

    const magWell = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.084, 0.09),
      darkPolymer,
    );
    magWell.position.set(0, -0.07, 0.03);
    this.pistol.add(magWell);

    const magazine = new THREE.Mesh(
      new THREE.BoxGeometry(0.053, 0.19, 0.08),
      steel,
    );
    magazine.position.set(0, -0.18, -0.002);
    magazine.rotation.x = -0.16;
    this.pistol.add(magazine);

    const magPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.056, 0.02, 0.06),
      brass,
    );
    magPlate.position.set(0, -0.283, 0.008);
    this.pistol.add(magPlate);

    const triggerGuard = new THREE.Mesh(
      new THREE.TorusGeometry(0.033, 0.006, 8, 18, Math.PI),
      steel,
    );
    triggerGuard.rotation.set(Math.PI / 2, Math.PI, 0);
    triggerGuard.position.set(0, -0.078, 0.088);
    this.pistol.add(triggerGuard);

    const pistolGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.17, 0.106),
      tanPolymer,
    );
    pistolGrip.position.set(0, -0.167, 0.15);
    pistolGrip.rotation.x = -0.42;
    this.pistol.add(pistolGrip);

    const bufferTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.017, 0.017, 0.24, 12),
      steel,
    );
    bufferTube.rotation.x = Math.PI / 2;
    bufferTube.position.set(0, 0.0, 0.302);
    this.pistol.add(bufferTube);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.124, 0.2),
      tanPolymer,
    );
    stock.position.set(0, -0.02, 0.47);
    this.pistol.add(stock);

    const buttPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.126, 0.124, 0.03),
      darkPolymer,
    );
    buttPad.position.set(0, -0.02, 0.575);
    this.pistol.add(buttPad);

    const handguard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.042, 0.45, 14),
      darkPolymer,
    );
    handguard.rotation.x = Math.PI / 2;
    handguard.position.set(0, 0.034, -0.44);
    this.pistol.add(handguard);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0135, 0.0135, 0.64, 12),
      bluedSteel,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.034, -0.64);
    this.pistol.add(barrel);

    const muzzleBrake = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.021, 0.062, 12),
      steel,
    );
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.034, -0.99);
    this.pistol.add(muzzleBrake);

    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.012, 0.58),
      steel,
    );
    topRail.position.set(0, 0.092, -0.24);
    this.pistol.add(topRail);

    const rearSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.026, 0.03),
      steel,
    );
    rearSight.position.set(0, 0.103, 0.12);
    this.pistol.add(rearSight);

    const frontSight = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.03, 0.024),
      steel,
    );
    frontSight.position.set(0, 0.103, -0.79);
    this.pistol.add(frontSight);

    const opticBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.22, 14),
      steel,
    );
    opticBody.rotation.x = Math.PI / 2;
    opticBody.position.set(0, 0.134, -0.24);
    this.pistol.add(opticBody);

    const opticLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 16),
      opticGlass,
    );
    opticLens.position.set(0, 0.134, -0.35);
    this.pistol.add(opticLens);

    this.createMuzzleFlash(
      this.pistol,
      new THREE.Vector3(0, 0.034, -1.03),
      0.32,
    );

    this.attachWeaponArms(this.pistol, {
      rightGrip: new THREE.Vector3(0.045, -0.115, 0.15),
      rightRot: new THREE.Euler(-0.74, 0.18, -0.19),
      leftGrip: new THREE.Vector3(-0.03, -0.01, -0.37),
      leftRot: new THREE.Euler(-0.9, -0.08, 0.28),
    });

    this.pistol.position.set(0.21, -0.285, -0.47);
    this.pistol.rotation.y = -0.09;
    this.pistol.scale.set(1.48, 1.48, 1.48);
    this.pistol.visible = false;
    this.weaponGroup.add(this.pistol);
  }

  createShotgun() {
    this.shotgun = new THREE.Group();
    const {
      bluedSteel,
      steel,
      polymer,
      darkPolymer,
      walnut,
      brass,
      opticGlass,
    } = this.materials;

    const receiver = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.13, 0.32),
      darkPolymer,
    );
    receiver.position.set(0, 0.01, -0.04);
    this.shotgun.add(receiver);

    const ejectionSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.06, 0.14),
      steel,
    );
    ejectionSide.position.set(-0.088, 0.03, -0.03);
    this.shotgun.add(ejectionSide);

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.033, 0.033, 0.95, 16),
      bluedSteel,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.045, -0.56);
    this.shotgun.add(barrel);

    const magTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.021, 0.021, 0.77, 14),
      steel,
    );
    magTube.rotation.x = Math.PI / 2;
    magTube.position.set(0, -0.023, -0.46);
    this.shotgun.add(magTube);

    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.06, 14),
      steel,
    );
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.045, -1.05);
    this.shotgun.add(muzzle);

    const pump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.057, 0.057, 0.26, 14),
      polymer,
    );
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.02, -0.54);
    this.shotgun.add(pump);

    const pumpRib = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.015, 0.22),
      darkPolymer,
    );
    pumpRib.position.set(0, 0.01, -0.54);
    this.shotgun.add(pumpRib);

    const shellCarrier = new THREE.Mesh(
      new THREE.BoxGeometry(0.017, 0.07, 0.25),
      steel,
    );
    shellCarrier.position.set(0.09, 0.015, -0.03);
    this.shotgun.add(shellCarrier);

    for (let i = 0; i < 5; i++) {
      const shell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.063, 10),
        brass,
      );
      shell.rotation.x = Math.PI / 2;
      shell.position.set(0.095, 0.015, -0.14 + i * 0.06);
      this.shotgun.add(shell);
    }

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.104, 0.16, 0.5),
      walnut,
    );
    stock.position.set(0, -0.09, 0.33);
    stock.rotation.x = -0.23;
    this.shotgun.add(stock);

    const buttPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.17, 0.03),
      darkPolymer,
    );
    buttPad.position.set(0, -0.18, 0.55);
    this.shotgun.add(buttPad);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.083, 0.18, 0.115),
      walnut,
    );
    grip.position.set(0, -0.18, 0.08);
    grip.rotation.x = -0.45;
    this.shotgun.add(grip);

    const triggerGuard = new THREE.Mesh(
      new THREE.TorusGeometry(0.036, 0.006, 8, 18, Math.PI),
      steel,
    );
    triggerGuard.rotation.set(Math.PI / 2, Math.PI, 0);
    triggerGuard.position.set(0, -0.088, 0.03);
    this.shotgun.add(triggerGuard);

    const frontBead = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 10, 8),
      brass,
    );
    frontBead.position.set(0, 0.08, -0.92);
    this.shotgun.add(frontBead);

    const ghostRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.022, 0.003, 8, 16),
      steel,
    );
    ghostRing.position.set(0, 0.09, -0.18);
    ghostRing.rotation.x = Math.PI / 2;
    this.shotgun.add(ghostRing);

    const miniLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 12),
      opticGlass,
    );
    miniLens.position.set(0, 0.09, -0.205);
    this.shotgun.add(miniLens);

    this.createMuzzleFlash(
      this.shotgun,
      new THREE.Vector3(0, 0.045, -1.09),
      0.45,
    );

    this.attachWeaponArms(this.shotgun, {
      rightGrip: new THREE.Vector3(0.046, -0.12, 0.1),
      rightRot: new THREE.Euler(-0.82, 0.16, -0.2),
      leftGrip: new THREE.Vector3(-0.03, -0.03, -0.53),
      leftRot: new THREE.Euler(-0.98, -0.1, 0.3),
    });

    this.shotgun.position.set(0.18, -0.33, -0.35);
    this.shotgun.rotation.y = -0.03;
    this.shotgun.scale.set(1.72, 1.72, 1.72);
    this.shotgun.visible = false;
    this.weaponGroup.add(this.shotgun);
  }

  createRocketLauncher() {
    this.rocket = new THREE.Group();
    const {
      bluedSteel,
      steel,
      polymer,
      darkPolymer,
      tanPolymer,
      opticGlass,
      accent,
    } = this.materials;

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.108, 0.108, 1.02, 16),
      bluedSteel,
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.06, -0.4);
    this.rocket.add(tube);

    const frontRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.108, 0.012, 8, 16),
      steel,
    );
    frontRing.rotation.x = Math.PI / 2;
    frontRing.position.set(0, 0.06, -0.92);
    this.rocket.add(frontRing);

    const rearRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.108, 0.012, 8, 16),
      steel,
    );
    rearRing.rotation.x = Math.PI / 2;
    rearRing.position.set(0, 0.06, 0.12);
    this.rocket.add(rearRing);

    const rearVent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12, 1, true),
      steel,
    );
    rearVent.rotation.x = Math.PI / 2;
    rearVent.position.set(0, 0.06, 0.14);
    this.rocket.add(rearVent);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.082, 0.022, 0.5),
      darkPolymer,
    );
    rail.position.set(0, 0.16, -0.31);
    this.rocket.add(rail);

    const opticBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.24, 14),
      steel,
    );
    opticBody.rotation.x = Math.PI / 2;
    opticBody.position.set(0, 0.208, -0.285);
    this.rocket.add(opticBody);

    const opticLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.03, 16),
      opticGlass,
    );
    opticLens.position.set(0, 0.208, -0.408);
    this.rocket.add(opticLens);

    const foreGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.084, 0.185, 0.12),
      polymer,
    );
    foreGrip.position.set(0, -0.103, -0.11);
    foreGrip.rotation.x = -0.18;
    this.rocket.add(foreGrip);

    const rearGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.104, 0.2, 0.13),
      tanPolymer,
    );
    rearGrip.position.set(0, -0.125, 0.16);
    rearGrip.rotation.x = -0.37;
    this.rocket.add(rearGrip);

    const shoulderPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.14, 0.09),
      darkPolymer,
    );
    shoulderPad.position.set(0, -0.08, 0.35);
    this.rocket.add(shoulderPad);

    const warningBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.126, 0.08),
      accent,
    );
    warningBand.position.set(0.108, 0.06, -0.56);
    this.rocket.add(warningBand);

    this.createMuzzleFlash(
      this.rocket,
      new THREE.Vector3(0, 0.06, -0.98),
      0.5,
    );

    this.attachWeaponArms(this.rocket, {
      rightGrip: new THREE.Vector3(0.05, -0.12, 0.16),
      rightRot: new THREE.Euler(-0.82, 0.18, -0.2),
      leftGrip: new THREE.Vector3(-0.035, -0.1, -0.1),
      leftRot: new THREE.Euler(-0.95, -0.12, 0.3),
    });

    this.rocket.position.set(0.14, -0.255, -0.31);
    this.rocket.rotation.y = -0.08;
    this.rocket.scale.set(1.56, 1.56, 1.56);
    this.rocket.visible = false;
    this.weaponGroup.add(this.rocket);
  }

  createMuzzleFlash(parent, position, size = 0.45) {
    const flashGeo = new THREE.PlaneGeometry(size, size);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffefbf,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const flashA = new THREE.Mesh(flashGeo, flashMat);
    flashA.position.copy(position);
    flashA.userData.isMuzzleFlash = true;
    flashA.userData.noBulletBlock = true;

    const flashB = new THREE.Mesh(flashGeo, flashMat.clone());
    flashB.position.copy(position);
    flashB.rotation.z = Math.PI / 2;
    flashB.userData.isMuzzleFlash = true;
    flashB.userData.noBulletBlock = true;

    const flashC = new THREE.Mesh(
      new THREE.PlaneGeometry(size * 0.65, size * 1.35),
      flashMat.clone(),
    );
    flashC.position.copy(position);
    flashC.rotation.z = Math.PI / 4;
    flashC.userData.isMuzzleFlash = true;
    flashC.userData.noBulletBlock = true;

    parent.add(flashA);
    parent.add(flashB);
    parent.add(flashC);
  }

  pulseMuzzleFlash(weapon) {
    if (!weapon) return;
    const flashes = [];
    weapon.traverse((child) => {
      if (!child.userData?.isMuzzleFlash || !child.material?.transparent) return;
      flashes.push(child);
    });

    if (!flashes.length) return;

    flashes.forEach((flash) => {
      flash.material.opacity = 0.94;
      flash.rotation.z += Math.random() * Math.PI;
      const flashScale = 0.85 + Math.random() * 0.65;
      flash.scale.set(flashScale, flashScale, 1);
    });

    setTimeout(() => {
      flashes.forEach((flash) => {
        if (flash.material) {
          flash.material.opacity = 0;
          flash.scale.set(1, 1, 1);
        }
      });
    }, 42);
  }

  recoil() {
    if (!this.weaponGroup) return;

    const weapon = this.getActiveWeapon();

    if (this.currentType === "hitscan") {
      this.recoilOffset.z = 0.1;
      this.recoilOffset.y = 0.045;
      this.weaponGroup.rotation.x = 0.1;

      if (this.pistolSlide) {
        this.pistolSlide.position.z = 0.07;
        setTimeout(() => {
          if (this.pistolSlide) this.pistolSlide.position.z = 0;
        }, 75);
      }
    } else if (this.currentType === "shotgun") {
      this.recoilOffset.z = 0.24;
      this.recoilOffset.y = 0.12;
      this.weaponGroup.rotation.x = 0.32;
    } else if (this.currentType === "projectile") {
      this.recoilOffset.z = 0.2;
      this.recoilOffset.y = 0.095;
      this.weaponGroup.rotation.x = 0.16;
    }

    this.pulseMuzzleFlash(weapon);
  }

  getActiveWeapon() {
    if (this.currentType === "hitscan") return this.pistol;
    if (this.currentType === "shotgun") return this.shotgun;
    if (this.currentType === "projectile") return this.rocket;
    return null;
  }

  updateWeapon(type) {
    this.currentType = type;

    if (this.pistol) this.pistol.visible = false;
    if (this.shotgun) this.shotgun.visible = false;
    if (this.rocket) this.rocket.visible = false;

    if (type === "hitscan" && this.pistol) this.pistol.visible = true;
    if (type === "shotgun" && this.shotgun) this.shotgun.visible = true;
    if (type === "projectile" && this.rocket) this.rocket.visible = true;
  }

  update(dt, isMoving) {
    if (!this.weaponGroup) return;
    this.time += dt * 10;

    this.recoilOffset.lerp(this.zeroVec, dt * 12);
    this.weaponGroup.rotation.x *= 0.85;

    const swayScale = this.currentType === "shotgun"
      ? 1.08
      : this.currentType === "projectile"
        ? 0.92
        : 1.0;

    if (isMoving) {
      this.swayPos.y = Math.sin(this.time) * 0.021 * swayScale;
      this.swayPos.x = Math.cos(this.time * 0.5) * 0.017 * swayScale;
      this.swayPos.z = Math.sin(this.time * 0.5) * 0.009 * swayScale;
      this.weaponGroup.rotation.z = Math.sin(this.time * 0.5) * 0.016 * swayScale;
      this.weaponGroup.rotation.y = Math.sin(this.time * 0.26) * 0.013;
    } else {
      this.swayPos.lerp(this.zeroVec, dt * 6.5);
      this.weaponGroup.rotation.z *= 0.9;
      this.weaponGroup.rotation.y *= 0.88;
    }

    if (!isMoving) {
      this.swayPos.y = Math.sin(this.time * 0.34) * 0.008;
    }

    this.weaponGroup.position.x =
      this.basePos.x + this.swayPos.x + this.recoilOffset.x;
    this.weaponGroup.position.y =
      this.basePos.y + this.swayPos.y + this.recoilOffset.y;
    this.weaponGroup.position.z =
      this.basePos.z + this.swayPos.z + this.recoilOffset.z;
  }
}

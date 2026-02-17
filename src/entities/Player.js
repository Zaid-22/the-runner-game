import * as THREE from "three";
import { Body, Box, Vec3, Material } from "cannon-es";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { WeaponModel } from "./WeaponModel.js";

export class Player {
  constructor(
    scene,
    world,
    camera,
    input,
    enemies,
    audio,
    onScore,
    onShootProjectile,
    onCameraShake,
    onHit,
    onHealthChange,
    particles,
    getDamageMultiplier,
    domElement = document.body, // DOM element for pointer lock
  ) {
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.input = input;
    this.enemies = enemies;
    this.audio = audio;
    this.onScore = onScore;
    this.onShootProjectile = onShootProjectile;
    this.onCameraShake = onCameraShake;
    this.onHit = onHit;
    this.onHealthChange = onHealthChange;
    this.particles = particles;
    this.getDamageMultiplier = getDamageMultiplier || (() => 1.0);
    this.activeIntervals = [];
    this.allowUnlockedInput = false;

    this.maxHealth = 100;
    this.health = 100;

    this.camera.position.y = 1.6; // Eye height

    this.controls = new PointerLockControls(this.camera, domElement);

    this.weaponModel = new WeaponModel(this.camera);
    this.handWeaponRecoil = 0;
    this.extraRecoilKick = 0;
    this.extraRecoilYaw = 0;
    this.extraRecoilRoll = 0;
    this.crosshairKick = 0;
    this.cachedCrosshairEl = null;
    this.lastImpactSfxMs = 0;
    this.lastImpactVfxMs = 0;

    // Config - Movement tuned for readable pacing
    // Movement Config
    this.speed = 28;
    this.speedMultiplier = 1.0;
    this.jumpForce = 11.5;
    this.groundAcceleration = 22;
    this.airAcceleration = 7.5;
    this.airControl = 0.55;
    this.canJump = false;
    this.lastGroundedTime = performance.now();
    this.jumpBufferDuration = 0.15;
    this.jumpQueuedUntil = 0;
    this.wasSpaceDown = false;
    this.wasDashDown = false;
    this.isSliding = false;
    this.slideTime = 0;
    this.targetCameraHeight = 1.6;
    this.currentCameraHeight = 1.6;
    this.overlapResolveTimer = Math.random() * 0.12;
    this.playerStuckTimer = 0;
    this.lastPlanarPosition = new THREE.Vector2();

    // Dash Config
    this.canDash = true;
    this.dashForce = 92;
    this.dashCooldown = 0.9;
    this.lastDashTime = 0;
    this.isDashing = false;

    // Weapons
    this.weapons = [
      {
        name: "Pistol",
        damage: 24,
        rate: 0.16,
        type: "hitscan",
        range: 72,
        ammo: 110,
        maxAmmo: 160,
      },
      {
        name: "Shotgun",
        damage: 11,
        rate: 0.72,
        type: "shotgun",
        pellets: 10,
        spread: 0.14,
        range: 24,
        minDamageFactor: 0.34,
        splashRadius: 2.8,
        splashDamage: 9,
        splashMinFactor: 0.22,
        ammo: 28,
        maxAmmo: 56,
      },
      {
        name: "Rocket",
        damage: 120,
        rate: 1.35,
        type: "projectile",
        ammo: 8,
        maxAmmo: 14,
      },
    ];
    this.currentWeaponIndex = 0;
    this.lastShootTime = 0;

    // Click to lock
    // Click to lock handled in Game logic via Start/Resume
    // document.addEventListener("click", () => {
    //   this.controls.lock();
    // });

    this.initVisuals();
    this.initPhysics();
    if (this.body) {
      this.lastPlanarPosition.set(this.body.position.x, this.body.position.z);
    }
  }

  get currentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  initVisuals() {
    this.bodyMesh = new THREE.Group();

    // Torso (You see this when looking down)
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0x111111, // Darker, matching robo-style
      roughness: 0.5,
      metalness: 0.8,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 1.2, -0.1); // Move back slightly to avoid camera clipping
    torso.castShadow = true;
    this.bodyMesh.add(torso);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.7,
      roughness: 0.4,
    });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 0.9, 0.1);
    leftArm.rotation.z = 0.3;
    leftArm.castShadow = true;
    this.bodyMesh.add(leftArm);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.35, 0.98, 0.12);
    this.bodyMesh.add(this.rightArmGroup);

    this.rightArmMesh = new THREE.Mesh(armGeo, armMat);
    this.rightArmMesh.castShadow = true;
    this.rightArmMesh.position.set(0, -0.22, 0);
    this.rightArmMesh.rotation.z = -0.12;
    this.rightArmGroup.add(this.rightArmMesh);

    this.handWeaponGroup = new THREE.Group();
    this.handWeaponBasePos = new THREE.Vector3(0.09, -0.34, 0.28);
    this.handWeaponGroup.position.copy(this.handWeaponBasePos);
    this.rightArmGroup.add(this.handWeaponGroup);

    // Legs with knee joints
    // LEGS - Robo Style
    // Thighs (Boxy mech look)
    const thighGeo = new THREE.BoxGeometry(0.15, 0.45, 0.15);
    const shinGeo = new THREE.BoxGeometry(0.12, 0.45, 0.12);
    const bootGeo = new THREE.BoxGeometry(0.15, 0.1, 0.25);

    const legMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.3,
      metalness: 0.8,
    });
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

    // Left Leg Group
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.2, 0.7, 0);
    this.bodyMesh.add(this.leftLegGroup);

    this.leftThigh = new THREE.Mesh(thighGeo, legMat);
    this.leftThigh.position.y = -0.225; // Center pivot at top
    this.leftThigh.castShadow = true;
    this.leftLegGroup.add(this.leftThigh);

    this.leftShinGroup = new THREE.Group();
    this.leftShinGroup.position.set(0, -0.45, 0); // Knee joint
    this.leftLegGroup.add(this.leftShinGroup);

    this.leftShin = new THREE.Mesh(shinGeo, legMat);
    this.leftShin.position.y = -0.225;
    this.leftShin.castShadow = true;
    this.leftShinGroup.add(this.leftShin);

    const leftBoot = new THREE.Mesh(bootGeo, jointMat);
    leftBoot.position.y = -0.5; // Bottom of shin
    leftBoot.position.z = 0.05;
    this.leftShinGroup.add(leftBoot);

    // Right Leg Group
    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.2, 0.7, 0);
    this.bodyMesh.add(this.rightLegGroup);

    this.rightThigh = new THREE.Mesh(thighGeo, legMat);
    this.rightThigh.position.y = -0.225;
    this.rightThigh.castShadow = true;
    this.rightLegGroup.add(this.rightThigh);

    this.rightShinGroup = new THREE.Group();
    this.rightShinGroup.position.set(0, -0.45, 0); // Knee joint
    this.rightLegGroup.add(this.rightShinGroup);

    this.rightShin = new THREE.Mesh(shinGeo, legMat);
    this.rightShin.position.y = -0.225;
    this.rightShin.castShadow = true;
    this.rightShinGroup.add(this.rightShin);

    const rightBoot = new THREE.Mesh(bootGeo, jointMat);
    rightBoot.position.y = -0.5;
    rightBoot.position.z = 0.05;
    this.rightShinGroup.add(rightBoot);

    this.initHandWeaponModels();
    this.updateHandWeaponModel(this.currentWeapon.type);

    this.scene.add(this.bodyMesh);
  }

  initHandWeaponModels() {
    this.handWeapons = {
      hitscan: this.createHandPistol(),
      shotgun: this.createHandShotgun(),
      projectile: this.createHandRocket(),
    };

    Object.values(this.handWeapons).forEach((mesh) => {
      mesh.visible = false;
      this.handWeaponGroup.add(mesh);
    });
  }

  createHandPistol() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.3,
    });

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.22), mat);
    slide.position.set(0, 0.03, -0.05);
    group.add(slide);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.08), mat);
    grip.position.set(0, -0.05, 0.03);
    grip.rotation.x = -0.35;
    group.add(grip);

    group.rotation.set(0.05, -0.15, -0.05);
    group.scale.setScalar(1.45);
    return group;
  }

  createHandShotgun() {
    const group = new THREE.Group();
    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0x1b1b1b,
      metalness: 0.7,
      roughness: 0.4,
    });
    const stockMat = new THREE.MeshStandardMaterial({
      color: 0x5b3b22,
      roughness: 0.7,
      metalness: 0.0,
    });

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8),
      barrelMat,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.12);
    group.add(barrel);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.2), barrelMat);
    body.position.set(0, 0.0, 0.01);
    group.add(body);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), stockMat);
    stock.position.set(0, -0.03, 0.16);
    stock.rotation.x = -0.2;
    group.add(stock);

    group.rotation.set(0.08, -0.08, -0.05);
    group.scale.setScalar(1.28);
    return group;
  }

  createHandRocket() {
    const group = new THREE.Group();
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.65,
      roughness: 0.35,
    });

    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.44, 10),
      tubeMat,
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.02, -0.11);
    group.add(tube);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 8), tubeMat);
    cone.rotation.x = -Math.PI / 2;
    cone.position.set(0, 0.02, -0.36);
    group.add(cone);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.08), tubeMat);
    grip.position.set(0, -0.06, 0.04);
    group.add(grip);

    group.rotation.set(0.07, -0.1, -0.05);
    group.scale.setScalar(1.22);
    return group;
  }

  updateHandWeaponModel(type) {
    if (!this.handWeapons) return;

    Object.values(this.handWeapons).forEach((mesh) => {
      mesh.visible = false;
    });

    if (this.handWeapons[type]) {
      this.handWeapons[type].visible = true;
    }
  }

  initPhysics() {
    const shape = new Box(new Vec3(0.5, 1, 0.5));
    this.body = new Body({
      mass: 70, // kg
      position: new Vec3(0, 5, 30), // Safe spawn at South End (clear of raised platform)
      shape: shape,
      fixedRotation: true,
      material: new Material({ friction: 0.0, restitution: 0.0 }),
      collisionFilterGroup: 2, // Player Group
      collisionFilterMask: 1 | 4, // Walls (1) | Enemies (4) - EXCLUDES HoleCover (8)
    });
    this.body.linearDamping = 0.18; // Lower damping for responsive ground speed
    this.world.addBody(this.body);

    this.body.addEventListener("collide", (e) => {
      const contactNormal = new Vec3();
      e.contact.ni.negate(contactNormal);
      if (contactNormal.dot(new Vec3(0, 1, 0)) > 0.2) {
        this.canJump = true;
        this.lastGroundedTime = performance.now();
      }
    });
  }

  checkGrounded() {
    // Check if player is close to ground using physics body position
    const groundLevel = 0; // Ground is at y=0
    const playerBottom = this.body.position.y - 1; // Player body height/2

    // If player is very close to ground and not moving up fast, allow jump
    if (playerBottom <= groundLevel + 0.2 && this.body.velocity.y <= 0.1) {
      this.canJump = true;
      this.lastGroundedTime = performance.now();
    } else if (performance.now() - this.lastGroundedTime > 180) {
      this.canJump = false;
    }
  }

  resolveMovementCollisions(dt, inputVector, isGrounded) {
    if (!this.body || !this.world) return;

    this.overlapResolveTimer += dt;

    const arenaClamp = 42;
    if (this.body.position.x > arenaClamp) {
      this.body.position.x = arenaClamp;
      this.body.velocity.x = Math.min(0, this.body.velocity.x);
    } else if (this.body.position.x < -arenaClamp) {
      this.body.position.x = -arenaClamp;
      this.body.velocity.x = Math.max(0, this.body.velocity.x);
    }
    if (this.body.position.z > arenaClamp) {
      this.body.position.z = arenaClamp;
      this.body.velocity.z = Math.min(0, this.body.velocity.z);
    } else if (this.body.position.z < -arenaClamp) {
      this.body.position.z = -arenaClamp;
      this.body.velocity.z = Math.max(0, this.body.velocity.z);
    }

    const planarPos = new THREE.Vector2(this.body.position.x, this.body.position.z);
    const movedDist = planarPos.distanceTo(this.lastPlanarPosition);
    this.lastPlanarPosition.copy(planarPos);

    const hasInput = inputVector && inputVector.lengthSq() > 0.0001;
    const horizontalSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    const tryingToMove = hasInput && (horizontalSpeed > 1 || isGrounded);

    if (tryingToMove && movedDist < 0.014) {
      this.playerStuckTimer += dt;
    } else {
      this.playerStuckTimer = Math.max(0, this.playerStuckTimer - dt * 2.5);
    }

    if (this.overlapResolveTimer >= 0.13) {
      this.resolveStaticOverlap();
      this.overlapResolveTimer = 0;
    }

    if (this.playerStuckTimer > 0.45 && hasInput) {
      const sidestep = new THREE.Vector3(-inputVector.z, 0, inputVector.x);
      if (sidestep.lengthSq() < 0.0001) {
        sidestep.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      }
      sidestep.normalize();
      this.body.velocity.x += sidestep.x * 3.4;
      this.body.velocity.z += sidestep.z * 3.4;
      if (isGrounded) {
        this.body.velocity.y = Math.max(this.body.velocity.y, 1.2);
      }
      this.playerStuckTimer = 0.2;
    }
  }

  resolveStaticOverlap() {
    if (!this.body || !this.world) return;

    const radius = 0.58;
    const halfHeight = 1.0;
    let bestAxis = null;
    let bestDepth = Infinity;
    let bestSign = 0;

    for (const body of this.world.bodies) {
      if (!body || body.type !== Body.STATIC) continue;
      if (!body.shapes || body.shapes.length === 0) continue;
      if (body.collisionFilterGroup === 8) continue;

      const shape = body.shapes[0];
      if (!shape || !shape.halfExtents) continue;

      const half = shape.halfExtents;
      const dx = this.body.position.x - body.position.x;
      const dy = this.body.position.y - body.position.y;
      const dz = this.body.position.z - body.position.z;

      const overlapX = half.x + radius - Math.abs(dx);
      const overlapY = half.y + halfHeight - Math.abs(dy);
      const overlapZ = half.z + radius - Math.abs(dz);
      if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) continue;

      const isLargeFloorPiece =
        body.position.y <= 0.5 &&
        half.y >= 1.5 &&
        (half.x >= 10 || half.z >= 10);
      if (isLargeFloorPiece) continue;

      const horizontal = Math.min(overlapX, overlapZ);
      if (horizontal <= 0.02) continue;

      if (overlapX < overlapZ) {
        if (overlapX < bestDepth) {
          bestDepth = overlapX;
          bestAxis = "x";
          bestSign = dx >= 0 ? 1 : -1;
        }
      } else if (overlapZ < bestDepth) {
        bestDepth = overlapZ;
        bestAxis = "z";
        bestSign = dz >= 0 ? 1 : -1;
      }
    }

    if (!bestAxis || !Number.isFinite(bestDepth)) return;

    const push = Math.min(0.62, bestDepth + 0.05) * bestSign;
    if (bestAxis === "x") {
      this.body.position.x += push;
      this.body.velocity.x = bestSign * Math.max(1.9, Math.abs(this.body.velocity.x));
    } else {
      this.body.position.z += push;
      this.body.velocity.z = bestSign * Math.max(1.9, Math.abs(this.body.velocity.z));
    }
  }

  update(dt) {
    if (this.controls.isLocked || this.allowUnlockedInput) {
      // Weapon Switch
      if (this.input.isDown("Digit1")) this.currentWeaponIndex = 0;
      if (this.input.isDown("Digit2")) this.currentWeaponIndex = 1;
      if (this.input.isDown("Digit3")) this.currentWeaponIndex = 2;

      if (this.weaponModel) {
        this.weaponModel.updateWeapon(this.currentWeapon.type);
        const isMoving =
          this.input.isDown("KeyW") ||
          this.input.isDown("KeyS") ||
          this.input.isDown("KeyA") ||
          this.input.isDown("KeyD");
        this.weaponModel.update(dt, isMoving);
      }
      this.updateHandWeaponModel(this.currentWeapon.type);

      const velocity = this.body.velocity;
      const nowMs = performance.now();

      // Input Direction - Get camera's actual forward direction
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0; // Keep movement on horizontal plane
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
      const inputVector = new THREE.Vector3();
      if (this.input.isDown("KeyW")) inputVector.add(forward);
      if (this.input.isDown("KeyS")) inputVector.sub(forward);
      if (this.input.isDown("KeyA")) inputVector.sub(right);
      if (this.input.isDown("KeyD")) inputVector.add(right);
      if (inputVector.lengthSq() > 0.0001) inputVector.normalize();
      this.checkGrounded();
      const isGrounded = nowMs - this.lastGroundedTime < 180;

      // Slide Logic
      if (this.input.isDown("KeyC")) {
        if (!this.isSliding && velocity.length() > 5) {
          this.isSliding = true;
          this.slideTime = 0;
          // Boost speed slightly at start of slide
          this.body.velocity.x *= 1.2;
          this.body.velocity.z *= 1.2;
          this.audio?.playSlide?.();
          if (this.onCameraShake) this.onCameraShake(0.2);

          // Lower Camera
          this.targetCameraHeight = 0.8;
        }
      } else {
        this.isSliding = false;
        this.targetCameraHeight = 1.6;
      }

      if (this.isSliding) {
        // Friction
        this.body.velocity.x *= 0.98;
        this.body.velocity.z *= 0.98;
        this.slideTime += dt;
        if (this.slideTime > 1.0) this.isSliding = false; // Cap slide duration
      } else {
        // Normal Movement
        const moveSpeed = this.speed * this.speedMultiplier;
        const control = isGrounded ? 1.0 : this.airControl;
        const targetVx = inputVector.x * moveSpeed * control;
        const targetVz = inputVector.z * moveSpeed * control;
        const accel = isGrounded ? this.groundAcceleration : this.airAcceleration;
        const blend = Math.min(1, dt * accel);

        this.body.velocity.x += (targetVx - this.body.velocity.x) * blend;
        this.body.velocity.z += (targetVz - this.body.velocity.z) * blend;

        if (isGrounded && inputVector.lengthSq() > 0.0001) {
          // Keep ground speed consistently fast to avoid "only fast while jumping" feel.
          const boostedFloorSpeed = moveSpeed * 0.72;
          const planarSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
          if (planarSpeed < boostedFloorSpeed) {
            this.body.velocity.x = inputVector.x * boostedFloorSpeed;
            this.body.velocity.z = inputVector.z * boostedFloorSpeed;
          }
        }
      }

      // Dash Logic
      const now = nowMs / 1000;
      const dashDown = this.input.isDown("ShiftLeft") || this.input.isDown("ShiftRight");
      const dashPressed = dashDown && !this.wasDashDown;
      if (
        dashPressed &&
        this.canDash &&
        now - this.lastDashTime > this.dashCooldown &&
        !this.isSliding
      ) {
        this.isDashing = true;
        this.lastDashTime = now;

        // Apply massive force in current movement direction
        const dashDir = new THREE.Vector3();
        if (this.input.isDown("KeyW")) dashDir.add(forward);
        if (this.input.isDown("KeyS")) dashDir.sub(forward);
        if (this.input.isDown("KeyA")) dashDir.sub(right);
        if (this.input.isDown("KeyD")) dashDir.add(right);

        if (dashDir.lengthSq() === 0) dashDir.copy(forward);
        else dashDir.normalize();

        const dashBoost = this.dashForce * (1 + (this.speedMultiplier - 1) * 0.5);
        this.body.velocity.x += dashDir.x * dashBoost;
        this.body.velocity.z += dashDir.z * dashBoost;

        // Camera effect
        if (this.onCameraShake) this.onCameraShake(0.5);
        // FOV Kick
        this.camera.fov = 90;
        this.camera.updateProjectionMatrix();
        setTimeout(() => {
          this.camera.fov = 75;
          this.camera.updateProjectionMatrix();
        }, 200);
      }
      this.wasDashDown = dashDown;

      this.isDashing = now - this.lastDashTime < 0.2;

      const spaceDown = this.input.isDown("Space");
      if (spaceDown && !this.wasSpaceDown) {
        this.jumpQueuedUntil = now + this.jumpBufferDuration;
      }
      this.wasSpaceDown = spaceDown;

      if (this.jumpQueuedUntil >= now && isGrounded && !this.isSliding) {
        this.body.velocity.y = this.jumpForce;
        this.canJump = false;
        this.lastGroundedTime = -1e9;
        this.jumpQueuedUntil = 0;
        if (this.audio) this.audio.playFootstep(); // Jump sound
      }

      this.resolveMovementCollisions(dt, inputVector, isGrounded);

      // Shooting
      if (this.input.isDown("Mouse0")) {
        if (now - this.lastShootTime > this.currentWeapon.rate) {
          // Check Ammo
          if (this.currentWeapon.ammo > 0) {
            this.shoot();

            // Consume Ammo
            if (this.currentWeapon.ammo !== Infinity) {
              this.currentWeapon.ammo--;
            }
            this.lastShootTime = now;
          } else {
            // Out of ammo click
            if (now - this.lastShootTime > 0.5) {
              // Play dry fire sound
              if (this.audio) this.audio.playClick();
              this.lastShootTime = now;
            }
          }
        }
      }
    }

    this.camera.position.copy(this.body.position);
    // Smooth camera height for crouch/slide
    this.currentCameraHeight = THREE.MathUtils.lerp(
      this.currentCameraHeight || 1.6,
      this.targetCameraHeight || 1.6,
      dt * 10,
    );
    this.camera.position.y += this.currentCameraHeight - 1.0; // Offset relative to body center

    // Update Visual Body
    if (this.bodyMesh) {
      this.bodyMesh.position.copy(this.body.position);
      this.bodyMesh.position.y -= 1.0; // Offset visual body to align feet with ground (Physics origin is center)

      // Rotate body with camera Y (Yaw only)
      const euler = new THREE.Euler(0, 0, 0, "YXZ");
      euler.setFromQuaternion(this.camera.quaternion);
      this.bodyMesh.rotation.y = euler.y;

      // Tilt body if sliding
      if (this.isSliding) {
        this.bodyMesh.rotation.x = -0.5;
        this.bodyMesh.position.y -= 0.4;
      } else {
        this.bodyMesh.rotation.x = 0;
      }

      if (this.rightArmGroup) {
        this.handWeaponRecoil = THREE.MathUtils.lerp(
          this.handWeaponRecoil,
          0,
          dt * 16,
        );
        this.extraRecoilKick = THREE.MathUtils.lerp(
          this.extraRecoilKick,
          0,
          dt * 12,
        );
        this.extraRecoilYaw = THREE.MathUtils.lerp(
          this.extraRecoilYaw,
          0,
          dt * 11,
        );
        this.extraRecoilRoll = THREE.MathUtils.lerp(
          this.extraRecoilRoll,
          0,
          dt * 11,
        );

        const holdPitch = this.isSliding ? -0.42 : -0.72;
        this.rightArmGroup.rotation.x = holdPitch + this.handWeaponRecoil - this.extraRecoilKick * 0.28;
        this.rightArmGroup.rotation.y = (this.isSliding ? 0.28 : 0.22) + this.extraRecoilYaw * 0.35;
        this.rightArmGroup.rotation.z = -0.38 + this.extraRecoilRoll * 0.35;
      }

      if (this.handWeaponGroup && this.handWeaponBasePos) {
        this.handWeaponGroup.position.set(
          this.handWeaponBasePos.x + this.extraRecoilYaw * 0.018,
          this.handWeaponBasePos.y - this.extraRecoilKick * 0.08,
          this.handWeaponBasePos.z - this.extraRecoilKick * 0.17,
        );
        this.handWeaponGroup.rotation.x = -this.extraRecoilKick * 0.85;
        this.handWeaponGroup.rotation.y = this.extraRecoilYaw * 0.65;
        this.handWeaponGroup.rotation.z = this.extraRecoilRoll * 0.65;
      }

      // Leg animation with knee bending
      if (
        this.controls.isLocked &&
        !this.isSliding &&
        (this.input.isDown("KeyW") ||
          this.input.isDown("KeyS") ||
          this.input.isDown("KeyA") ||
          this.input.isDown("KeyD"))
      ) {
        const runSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
        const speedFactor = THREE.MathUtils.clamp(
          runSpeed / (this.speed * this.speedMultiplier || 1),
          0.7,
          1.6,
        );
        const time = performance.now() * (0.012 * speedFactor);

        // Complex walk cycle
        // Left Leg
        this.leftLegGroup.rotation.x = Math.sin(time) * 0.5;
        this.leftShinGroup.rotation.x = Math.max(
          0,
          -Math.cos(time + 0.5) * 0.8,
        ); // Kick back

        // Right Leg (Phase offset)
        this.rightLegGroup.rotation.x = Math.sin(time + Math.PI) * 0.5;
        this.rightShinGroup.rotation.x = Math.max(
          0,
          -Math.cos(time + Math.PI + 0.5) * 0.8,
        );

        // Footsteps
        if (Math.sin(time) > 0.95 && this.audio) {
          if (!this.lastStep || performance.now() - this.lastStep > 300) {
            this.audio.playFootstep();
            this.lastStep = performance.now();
          }
        }
      } else {
        // Reset
        this.leftLegGroup.rotation.x = 0;
        this.rightLegGroup.rotation.x = 0;
        this.leftShinGroup.rotation.x = 0;
        this.rightShinGroup.rotation.x = 0;
      }
    }

    this.updateCrosshairFeedback(dt);
  }

  shoot() {
    const weapon = this.currentWeapon;
    this.audio.playShoot(weapon.type);

    if (this.weaponModel) this.weaponModel.recoil();
    const recoilKick = weapon.type === "shotgun"
      ? 0.34
      : weapon.type === "projectile"
      ? 0.28
      : 0.2;
    const recoilCap = weapon.type === "shotgun" ? 0.5 : 0.36;
    this.handWeaponRecoil = Math.min(
      recoilCap,
      this.handWeaponRecoil + recoilKick,
    );
    this.extraRecoilKick = Math.min(
      weapon.type === "shotgun" ? 0.62 : weapon.type === "projectile" ? 0.54 : 0.42,
      this.extraRecoilKick + recoilKick * 0.95,
    );
    this.extraRecoilYaw = THREE.MathUtils.clamp(
      this.extraRecoilYaw + (Math.random() - 0.5) * (weapon.type === "shotgun" ? 0.18 : 0.12),
      -0.32,
      0.32,
    );
    this.extraRecoilRoll = THREE.MathUtils.clamp(
      this.extraRecoilRoll + (Math.random() - 0.5) * (weapon.type === "shotgun" ? 0.14 : 0.1),
      -0.28,
      0.28,
    );
    this.crosshairKick = Math.min(
      1.0,
      this.crosshairKick + (
        weapon.type === "shotgun"
          ? 0.44
          : weapon.type === "projectile"
            ? 0.34
            : 0.24
      ),
    );

    if (this.onCameraShake) {
      const shakeAmount = weapon.type === "shotgun"
        ? 0.2
        : weapon.type === "projectile"
          ? 0.24
          : 0.12;
      this.onCameraShake(shakeAmount);
    }

    if (weapon.type === "projectile") {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      const spawnPos = this.camera.position
        .clone()
        .add(dir.clone().multiplyScalar(1));
      if (this.onShootProjectile) {
        this.onShootProjectile(spawnPos, dir);
      }
    } else if (weapon.type === "shotgun") {
      const pelletHits = [];
      for (let i = 0; i < weapon.pellets; i++) {
        pelletHits.push(this.fireHitscan(
          weapon.damage,
          weapon.spread ?? 0.1,
          weapon.range || 26,
          weapon.type,
          { suppressImpactAudio: i > 0 },
        ));
      }

      let splashSource = null;
      let nearestImpactDistance = Infinity;
      const directTargets = new Set();
      for (const hit of pelletHits) {
        if (hit?.enemyHit) directTargets.add(hit.enemyHit);
        if (hit?.didImpact && hit.distance < nearestImpactDistance) {
          nearestImpactDistance = hit.distance;
          splashSource = hit.endPoint;
        }
      }
      if (splashSource) {
        this.applyShotgunSplash(splashSource, weapon, directTargets);
      }
    } else {
      this.fireHitscan(weapon.damage, 0.0, weapon.range || 100, weapon.type);
    }
  }

  fireHitscan(
    damage,
    spread,
    maxRange = 100,
    weaponType = "hitscan",
    options = {},
  ) {
    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    if (spread > 0) {
      dir.x += (Math.random() - 0.5) * spread;
      dir.y += (Math.random() - 0.5) * spread;
      dir.z += (Math.random() - 0.5) * spread;
      dir.normalize();
    }

    raycaster.set(this.camera.position, dir);
    raycaster.camera = this.camera; // REQUIRED for Sprites/Billboards

    const shotData = {
      didImpact: false,
      enemyHit: null,
      endPoint: null,
      distance: maxRange,
    };

    let endPoint = new THREE.Vector3()
      .copy(this.camera.position)
      .add(dir.multiplyScalar(maxRange)); // Max range

    const intersects = raycaster.intersectObjects(this.scene.children, true); // Recursive!

    for (const intersect of intersects) {
      // IGNORE PLAYER SELF-HIT
      // Check if the hit object is part of the player's body
      let isSelf = false;
      let pObj = intersect.object;
      while (pObj) {
        if (pObj === this.bodyMesh) {
          isSelf = true;
          break;
        }
        pObj = pObj.parent;
      }
      if (isSelf) continue; // Skip this hit, look for next one behind me

      // Ignore helper meshes (health bars, particles, pickup visuals, etc.)
      let isNonBlocking = false;
      let helperObj = intersect.object;
      while (helperObj) {
        if (helperObj.userData?.noBulletBlock) {
          isNonBlocking = true;
          break;
        }
        helperObj = helperObj.parent;
      }
      if (isNonBlocking) continue;

      // Check if this object or any parent is an enemy mesh
      let checkObj = intersect.object;
      let enemy = null;

      // Traverse up the hierarchy to find the enemy
      while (checkObj && !enemy) {
        enemy = this.enemies.find((e) => e.mesh === checkObj);
        checkObj = checkObj.parent;
      }

      if (enemy) {
        if (enemy.isDead) continue;
        endPoint.copy(intersect.point);
        shotData.didImpact = true;
        shotData.enemyHit = enemy;
        shotData.distance = intersect.distance ||
          this.camera.position.distanceTo(intersect.point);

        // Apply damage with multiplier
        let finalDamage = damage * this.getDamageMultiplier();
        const distance = shotData.distance;

        if (weaponType === "shotgun") {
          const shotgunMin = this.currentWeapon?.minDamageFactor ?? 0.35;
          const t = THREE.MathUtils.clamp(distance / Math.max(1, maxRange), 0, 1);
          finalDamage *= THREE.MathUtils.lerp(1.0, shotgunMin, t);
        }

        // HEADSHOT BONUS!
        const isHeadshot = !!intersect.object.userData.isHeadshot;
        if (isHeadshot) {
          finalDamage *= 2.0; // Double damage!

          // Visual feedback for headshot
          if (this.onScore) this.onScore(50); // Bonus score for headshot
        }

        enemy.takeDamage(finalDamage);

        // Hit Marker
        if (this.onHit) this.onHit(isHeadshot);

        this.playImpactFeedback(intersect.point, {
          target: isHeadshot ? "headshot" : "enemy",
          weaponType,
          suppressAudio: !!options.suppressImpactAudio,
        });

        this.awardKillScore(enemy);
        break;
      } else if (intersect.object.geometry) {
        // Hit world
        endPoint.copy(intersect.point);
        shotData.didImpact = true;
        shotData.distance = intersect.distance ||
          this.camera.position.distanceTo(intersect.point);
        this.playImpactFeedback(intersect.point, {
          target: "world",
          weaponType,
          suppressAudio: !!options.suppressImpactAudio,
        });
        break;
      }
    }

    this.drawTracer(this.camera.position, endPoint);
    shotData.endPoint = endPoint.clone();
    return shotData;
  }

  applyShotgunSplash(centerPoint, weapon, directTargets = new Set()) {
    const radius = Math.max(0.25, weapon.splashRadius ?? 0);
    if (radius <= 0) return;

    const minFactor = THREE.MathUtils.clamp(weapon.splashMinFactor ?? 0.22, 0, 1);
    const baseDamage = Math.max(
      1,
      (weapon.splashDamage ?? weapon.damage * 0.75) * this.getDamageMultiplier(),
    );

    let applied = false;
    for (const enemy of this.enemies) {
      if (!enemy || enemy.isDead || !enemy.mesh) continue;

      const dist = enemy.mesh.position.distanceTo(centerPoint);
      if (dist > radius) continue;

      const falloff = 1 - dist / radius;
      const splashScale = THREE.MathUtils.lerp(minFactor, 1, falloff);
      const directPenalty = directTargets.has(enemy) ? 0.55 : 1.0;
      const finalDamage = baseDamage * splashScale * directPenalty;
      if (finalDamage <= 0.05) continue;

      enemy.takeDamage(finalDamage);
      if (this.particles) {
        this.particles.emitBlood(enemy.mesh.position, enemy.isBoss ? 4 : 2);
      }
      this.awardKillScore(enemy);
      applied = true;
    }

    if (applied && this.particles) {
      this.particles.emitExplosion(centerPoint, 8);
    }
    if (applied) {
      this.playImpactFeedback(centerPoint, {
        target: "splash",
        weaponType: weapon.type || "shotgun",
        suppressVfx: true,
      });
    }
  }

  playImpactFeedback(point, {
    target = "world",
    weaponType = "hitscan",
    suppressAudio = false,
    suppressVfx = false,
  } = {}) {
    const now = performance.now();
    const shotgun = weaponType === "shotgun";

    if (!suppressVfx && this.particles) {
      const minVfxGap = shotgun ? 20 : 10;
      if (now - this.lastImpactVfxMs >= minVfxGap) {
        if (target === "enemy") {
          this.particles.emitBlood(point, 8);
        } else if (target === "headshot") {
          this.particles.emitBlood(point, 16);
          this.particles.emitExplosion(point, 3);
        } else if (target === "splash") {
          this.particles.emitExplosion(point, 7);
        } else {
          this.particles.emitExplosion(point, shotgun ? 6 : 4);
        }
        this.lastImpactVfxMs = now;
      }
    }

    if (!suppressAudio && this.audio?.playImpact) {
      const minSfxGap = shotgun ? 80 : 36;
      if (now - this.lastImpactSfxMs >= minSfxGap) {
        const intensity = shotgun
          ? 1.08
          : weaponType === "projectile"
            ? 1.2
            : 0.92;
        this.audio.playImpact({ target, weapon: weaponType, intensity });
        this.lastImpactSfxMs = now;
      }
    }
  }

  updateCrosshairFeedback(dt) {
    this.crosshairKick = THREE.MathUtils.lerp(this.crosshairKick, 0, dt * 12);

    const crosshair = this.cachedCrosshairEl || document.getElementById("crosshair");
    if (!crosshair) return;

    this.cachedCrosshairEl = crosshair;
    const scale = 1 + this.crosshairKick * 0.28;
    crosshair.style.setProperty("--crosshair-kick", String(this.crosshairKick));
    crosshair.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(3)})`;
  }

  awardKillScore(enemy) {
    if (!enemy || !enemy.isDead || enemy.scored || !this.onScore) return;
    enemy.scored = true;
    this.onScore(100);
  }

  drawTracer(start, end) {
    // Use a thin cylinder (mesh) instead of Line to avoid shader issues
    const gunOffset = new THREE.Vector3(0.2, -0.2, -0.5).applyQuaternion(
      this.camera.quaternion,
    );
    const startPos = start.clone().add(gunOffset);

    const distance = startPos.distanceTo(end);
    if (distance < 0.1) return;

    // Cylinder: radiusTop, radiusBottom, height, segments
    const geo = new THREE.CylinderGeometry(0.02, 0.02, distance, 6);
    geo.rotateX(-Math.PI / 2); // Align with Z axis
    geo.translate(0, 0, distance / 2); // Pivot at start

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(startPos);
    mesh.lookAt(end);
    mesh.userData.ephemeralFx = "tracer";

    this.scene.add(mesh);

    // Fade out
    let opacity = 0.8;
    const fade = setInterval(() => {
      // Safety: check if mesh still has parent (scene)
      if (!mesh.parent) {
        clearInterval(fade);
        // Remove from list
        const idx = this.activeIntervals.indexOf(fade);
        if (idx > -1) this.activeIntervals.splice(idx, 1);
        return;
      }

      opacity -= 0.1;
      mesh.material.opacity = opacity;
      if (opacity <= 0) {
        clearInterval(fade);
        const idx = this.activeIntervals.indexOf(fade);
        if (idx > -1) this.activeIntervals.splice(idx, 1);

        if (mesh.parent) this.scene.remove(mesh);
        // Full Dispose
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    }, 30);
    this.activeIntervals.push(fade);
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health < 0) this.health = 0;

    if (this.onHealthChange) {
      this.onHealthChange(this.health, "damage");
    }

    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(this.health + amount, this.maxHealth);
    if (this.onHealthChange) {
      this.onHealthChange(this.health, "heal");
    }
  }

  refillAllAmmo() {
    this.weapons.forEach((weapon) => {
      if (Number.isFinite(weapon.maxAmmo)) {
        weapon.ammo = weapon.maxAmmo;
      }
    });
  }

  setSpeedMultiplier(multiplier = 1.0) {
    this.speedMultiplier = THREE.MathUtils.clamp(multiplier, 0.75, 2.5);
  }

  resetForRestart(spawn = { x: 0, y: 2, z: 30 }) {
    if (!this.body) return;

    this.body.position.set(spawn.x, spawn.y, spawn.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    if (this.body.force) this.body.force.set(0, 0, 0);
    if (this.body.torque) this.body.torque.set(0, 0, 0);
    if (typeof this.body.wakeUp === "function") this.body.wakeUp();

    this.canJump = false;
    this.lastGroundedTime = performance.now();
    this.jumpQueuedUntil = 0;
    this.wasSpaceDown = false;
    this.wasDashDown = false;
    this.isSliding = false;
    this.slideTime = 0;
    this.isDashing = false;
    this.lastDashTime = 0;
    this.lastShootTime = 0;
    this.handWeaponRecoil = 0;
    this.extraRecoilKick = 0;
    this.extraRecoilYaw = 0;
    this.extraRecoilRoll = 0;
    this.crosshairKick = 0;
    this.lastImpactSfxMs = 0;
    this.lastImpactVfxMs = 0;
    this.targetCameraHeight = 1.6;
    this.currentCameraHeight = 1.6;
    this.overlapResolveTimer = 0;
    this.playerStuckTimer = 0;
    this.lastPlanarPosition.set(this.body.position.x, this.body.position.z);

    const crosshair = this.cachedCrosshairEl || document.getElementById("crosshair");
    if (crosshair) {
      this.cachedCrosshairEl = crosshair;
      crosshair.style.setProperty("--crosshair-kick", "0");
      crosshair.style.transform = "translate(-50%, -50%)";
    }
  }

  dispose() {
    if (this.activeIntervals) {
      this.activeIntervals.forEach(clearInterval);
      this.activeIntervals = [];
    }
  }
}

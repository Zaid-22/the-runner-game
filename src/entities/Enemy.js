import * as THREE from "three";
import { Body, Sphere, Vec3, Material } from "cannon-es";
import { MonsterFactory } from "./MonsterFactory.js";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const BASE_STEER_ANGLES = [0, 0.34, -0.34, 0.7, -0.7, 1.04, -1.04];
const HARD_STEER_ANGLES = [Math.PI * 0.5, -Math.PI * 0.5, 1.32, -1.32];

export class Enemy {
  constructor(scene, world, position, type = "base", forceBoss = false) {
    this.scene = scene;
    this.world = world;
    this.isDead = false;
    this.type = type;

    // 1. Stats Configuration
    this.config = this.getStats();
    this.health = this.config.health;
    this.maxHealth = this.config.health;
    this.speedMultiplier = 1.0;

    this.isBoss = forceBoss || this.type.includes("boss");
    this.visualYOffset = 0;

    // Physics State
    this.lastPosition = new THREE.Vector3();
    this.stuckTimer = 0;
    this.farTimer = 0;
    this.overlapResolveTimer = Math.random() * 0.15;
    this.forceUnstickCooldown = 0;

    // Animation State
    this.time = Math.random() * 100; // Random offset
    this.animState = {
      tiltX: 0,
      tiltZ: 0,
    };
    this.baseYaw = 0;
    this.targetYaw = 0;
    this.orbitSign = Math.random() < 0.5 ? -1 : 1;
    this.baseModelScale = new THREE.Vector3(1, 1, 1);
    this.smoothedMoveDir = new THREE.Vector3(0, 0, 1);
    this.visualPosition = new THREE.Vector3();
    this.bodyTargetPosition = new THREE.Vector3();
    this.detourDirection = new THREE.Vector3();

    // Create Mesh
    if (!this.mesh) {
      this.createMeshFromFactory(position);
    }

    // Create Body
    if (!this.body) {
      this.createPhysicsBody(position);
    }

    this.calibrateVisualOffset();
    if (this.mesh) {
      this.baseModelScale.copy(this.mesh.scale);
      this.visualPosition.copy(this.mesh.position);
    }

    if (this.body) {
      this.lastPosition.set(this.body.position.x, this.body.position.y, this.body.position.z);
    }
  }

  getStats() {
    switch (this.type) {
      case "arachnid":
        return { health: 160, speed: 10, damage: 20, size: 0.58 };
      case "specter":
        return { health: 130, speed: 11, damage: 30, size: 0.42 };
      case "titan":
        return { health: 900, speed: 6.8, damage: 65, size: 1.3 };
      case "brute":
        return { health: 280, speed: 8.6, damage: 36, size: 0.95 };
      case "harpy":
        return { health: 145, speed: 12, damage: 24, size: 0.5 };
      case "sentinel":
        return { health: 175, speed: 10.8, damage: 30, size: 0.62 };
      case "stalker":
        return { health: 120, speed: 15, damage: 24, size: 0.5 };
      case "kamikaze":
        return { health: 55, speed: 14, damage: 110, size: 0.3 };
      case "boss_warlord":
        return { health: 3200, speed: 8, damage: 42, size: 1.45 };
      case "void_reaper":
        return { health: 2900, speed: 8.4, damage: 40, size: 1.25 };
      case "nightfang":
        return { health: 3040, speed: 8.8, damage: 44, size: 1.2 };
      case "rift_judicator":
        return { health: 3180, speed: 9.2, damage: 46, size: 1.22 };
      case "eclipse_warden":
        return { health: 3340, speed: 9.5, damage: 49, size: 1.24 };
      default:
        return { health: 140, speed: 8, damage: 14, size: 0.5 };
    }
  }

  isFlyingType() {
    return (
      this.type === "harpy" ||
      this.type === "specter" ||
      this.type === "sentinel"
    );
  }

  calibrateVisualOffset() {
    if (!this.mesh || !this.body) return;

    const flying = this.isFlyingType();
    if (flying) {
      this.visualYOffset = 0;
      return;
    }

    this.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.mesh);
    if (bounds.isEmpty()) return;

    const localMinY = bounds.min.y - this.mesh.position.y;
    const clearance =
      this.type === "boss_warlord" ? 0.26 : this.isBoss ? 0.16 : 0.06;
    const alignedOffset = -this.collisionRadius - localMinY + clearance;
    if (!Number.isFinite(alignedOffset)) return;

    this.visualYOffset = THREE.MathUtils.clamp(alignedOffset, -2.5, 2.5);
  }

  ensureVisualFeetAboveGround() {
    if (!this.mesh || !this.body || this.isFlyingType()) return;
    if (this.type === "boss_warlord") return;
    if (!this.isBoss && this.type !== "titan" && this.type !== "brute") return;

    this.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.mesh);
    if (bounds.isEmpty()) return;

    const desiredMinY = this.body.position.y - (this.collisionRadius || this.config.size) + 0.06;
    if (bounds.min.y < desiredMinY) {
      this.mesh.position.y += desiredMinY - bounds.min.y;
    }
  }

  createMeshFromFactory(position) {
    this.mesh = MonsterFactory.create(this.type, this.isBoss);
    if (this.mesh) {
      this.mesh.position.copy(position);
      this.scene.add(this.mesh);
    } else {
      this.createDefaultMesh(position);
    }
  }

  createDefaultMesh(position) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.scene.add(this.mesh);
  }

  createPhysicsBody(position) {
    const radius = this.getCollisionRadius();
    this.collisionRadius = radius;
    const shape = new Sphere(radius);

    this.body = new Body({
      mass: this.isBoss || this.type === "titan" ? 85 : 5,
      position: new Vec3(position.x, position.y, position.z),
      shape: shape,
      fixedRotation: true, // Prevent tipping over
      material: new Material({ friction: 0.0, restitution: 0.0 }), // Zero friction to prevent sticking to walls
      linearDamping: 0.3, // Slightly higher damping to smooth pace.
      allowSleep: false, // Prevent heavy enemies/bosses from freezing in place
      collisionFilterGroup: 4, // Enemy Group (matches player mask and hole-cover mask)
      collisionFilterMask: 1 | 2 | 8, // Walls, Player, Enemy-only hole cover (skip enemy-enemy collision jitter)
    });

    this.world.addBody(this.body);
  }

  estimateRadiusFromMesh() {
    if (!this.mesh) return null;
    this.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(this.mesh);
    if (bounds.isEmpty()) return null;

    const size = bounds.getSize(new THREE.Vector3());
    const footprintRadius = Math.max(size.x, size.z) * 0.5;
    if (!Number.isFinite(footprintRadius) || footprintRadius <= 0.01) {
      return null;
    }

    let factor = 0.68;
    if (this.isBoss || this.type === "boss_warlord" || this.type === "titan" || this.type === "brute") {
      factor = 0.7;
    } else if (this.type === "harpy" || this.type === "sentinel") {
      // Wings should not fully determine collision radius.
      factor = 0.54;
    } else if (this.type === "specter") {
      factor = 0.78;
    } else if (this.type === "kamikaze") {
      factor = 0.64;
    }

    const rawRadius = footprintRadius * factor;
    const minRadius = this.isBoss ? 1.35 : 0.42;
    let maxRadius = this.isBoss ? 1.95 : 1.2;

    if (this.type === "titan" || this.type === "brute") {
      maxRadius = this.isBoss ? 2.0 : 1.45;
    } else if (this.type === "kamikaze") {
      maxRadius = 0.72;
    } else if (this.type === "specter") {
      maxRadius = 0.75;
    } else if (this.type === "sentinel") {
      maxRadius = 1.15;
    }

    return THREE.MathUtils.clamp(rawRadius, minRadius, maxRadius);
  }

  getCollisionRadius() {
    const meshRadius = this.estimateRadiusFromMesh();
    if (Number.isFinite(meshRadius)) return meshRadius;

    if (this.type === "boss_warlord") return this.isBoss ? 1.26 : 1.16;
    if (this.type === "void_reaper") return this.isBoss ? 1.22 : 0.56;
    if (this.type === "nightfang") return this.isBoss ? 1.18 : 0.58;
    if (this.type === "rift_judicator") return this.isBoss ? 1.2 : 0.56;
    if (this.type === "eclipse_warden") return this.isBoss ? 1.22 : 0.58;
    if (this.type === "titan") return this.isBoss ? 1.2 : 1.08;
    if (this.type === "brute") return 0.95;
    if (this.type === "arachnid") return 0.62;
    if (this.type === "stalker") return 0.5;
    if (this.type === "harpy") return 0.52;
    if (this.type === "sentinel") return 0.62;
    if (this.type === "specter") return 0.48;
    if (this.type === "kamikaze") return 0.34;
    return Math.max(0.38, this.config.size || 0.5);
  }

  update(dt, playerPos, allEnemies) {
    if (this.isDead) return;

    // 1. Physics Safeguards
    this.updateSafeguards(dt, playerPos);

    if (this.mesh && this.body) {
      // Smooth boss/heavy visuals so movement looks less jittery than raw physics.
      if (this.isBoss || this.type === "titan" || this.type === "brute") {
        this.bodyTargetPosition.set(
          this.body.position.x,
          this.body.position.y,
          this.body.position.z,
        );
        const snapDistanceSq = this.isBoss ? 14.0 : 10.0;
        if (
          !Number.isFinite(this.visualPosition.x) ||
          this.visualPosition.distanceToSquared(this.bodyTargetPosition) > snapDistanceSq
        ) {
          // Snap visuals after forced unsticks/teleports to avoid visible "ghost glide" glitches.
          this.visualPosition.copy(this.bodyTargetPosition);
        } else {
          const lerpAlpha = Math.min(1, 1 - Math.exp(-dt * 11));
          this.visualPosition.lerp(this.bodyTargetPosition, lerpAlpha);
        }
        this.mesh.position.copy(this.visualPosition);
      } else {
        this.mesh.position.copy(this.body.position);
      }

      // Physics body is centered, so some models need visual offsets.
      if (this.visualYOffset !== 0) {
        this.mesh.position.y += this.visualYOffset;
      }
    }

    // 2. Behavior (AI)
    if (playerPos && this.body) {
      this.updateBehavior(dt, playerPos, allEnemies);
    }

    // 3. Procedural Animation
    if (this.mesh) {
      this.updateAnimation(dt, this.body.velocity);
      this.ensureVisualFeetAboveGround();
    }
  }

  updateSafeguards(dt, playerPos) {
    if (!this.body) return;
    const isFlying = this.isFlyingType();

    // Anti-Fall
    if (this.body.position.y < -10) {
      const recoveryPos = this.getSafeRecoveryPosition(playerPos);
      this.body.position.set(recoveryPos.x, recoveryPos.y, recoveryPos.z);
      this.body.velocity.set(0, 0, 0);
      this.stuckTimer = 0;
      this.lastPosition.copy(recoveryPos);
      this.visualPosition.copy(recoveryPos);
      if (this.mesh) this.mesh.position.copy(recoveryPos);
      return;
    }

    this.forceUnstickCooldown = Math.max(0, this.forceUnstickCooldown - dt);
    this.overlapResolveTimer += dt;
    this.recoverFromArenaBounds();
    if (this.overlapResolveTimer >= 0.22) {
      this.resolveStaticOverlap();
      this.overlapResolveTimer = 0;
    }

    if (isFlying) {
      // Keep flyers off the floor to prevent clipping/jitter.
      if (this.body.position.y < 1.2) {
        this.body.velocity.y = Math.max(this.body.velocity.y, 3.0);
      }
      return;
    }

    // Keep ground units stable near floor to reduce hopping/jitter artifacts.
    const minGroundY = this.collisionRadius || this.config.size;
    if (this.body.position.y < minGroundY - 0.25) {
      this.body.position.y = minGroundY;
      if (this.body.velocity.y < 0) this.body.velocity.y = 0;
    }
    if (
      this.body.position.y <= minGroundY + 0.05 &&
      Math.abs(this.body.velocity.y) < 1.5
    ) {
      this.body.velocity.y *= 0.5;
      if (Math.abs(this.body.velocity.y) < 0.08) this.body.velocity.y = 0;
    }

    // Anti-Stuck logic based on real movement, not just current velocity.
    const movedX = this.body.position.x - this.lastPosition.x;
    const movedZ = this.body.position.z - this.lastPosition.z;
    const movedDist = Math.hypot(movedX, movedZ);
    this.lastPosition.set(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z,
    );

    const horizontalSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    const distToPlayer2D = playerPos
      ? Math.hypot(
          playerPos.x - this.body.position.x,
          playerPos.z - this.body.position.z,
        )
      : 0;

    if (playerPos) {
      const farThreshold = this.isBoss ? 58 : 50;
      if (distToPlayer2D > farThreshold) {
        this.farTimer += dt;
      } else {
        this.farTimer = Math.max(0, this.farTimer - dt * 2.2);
      }

      const farTimeout = this.isBoss ? 8.5 : 7.0;
      if (this.farTimer > farTimeout && this.forceUnstickCooldown <= 0) {
        const closePos = this.getCloseRecoveryPosition(playerPos);
        this.body.position.set(closePos.x, closePos.y, closePos.z);
        this.body.velocity.set(0, 0, 0);
        this.lastPosition.copy(closePos);
        this.visualPosition.copy(closePos);
        if (this.mesh) this.mesh.position.copy(closePos);
        this.stuckTimer = 0;
        this.farTimer = 0;
        this.forceUnstickCooldown = this.isBoss ? 1.4 : 0.9;
        return;
      }
    } else {
      this.farTimer = 0;
    }

    const preferredDist = this.isBoss ? 2.2 : 1.5;
    const shouldBeClosingGap = playerPos
      ? distToPlayer2D > preferredDist + 0.4
      : false;
    const isTryingToMove = horizontalSpeed > 0.6 || shouldBeClosingGap;
    const minMovement = this.isBoss ? 0.035 : 0.02;
    const isActuallyMoving = movedDist > minMovement;

    if (isTryingToMove && !isActuallyMoving) {
      this.stuckTimer += dt * (this.isBoss ? 0.7 : 1.0);

      if (
        this.isBoss &&
        this.stuckTimer > 1.2 &&
        this.forceUnstickCooldown <= 0
      ) {
        const recoveryPos = this.getSafeRecoveryPosition(playerPos);
        this.body.position.set(recoveryPos.x, recoveryPos.y, recoveryPos.z);

        if (playerPos) {
          const toPlayer = new THREE.Vector3(
            playerPos.x - recoveryPos.x,
            0,
            playerPos.z - recoveryPos.z,
          );
          if (toPlayer.lengthSq() > 0.001) {
            toPlayer.normalize();
            const launchSpeed = this.config.speed * this.speedMultiplier * 0.85;
            this.body.velocity.x = toPlayer.x * launchSpeed;
            this.body.velocity.z = toPlayer.z * launchSpeed;
          }
        } else {
          this.body.velocity.x = 0;
          this.body.velocity.z = 0;
        }

        this.body.velocity.y = Math.max(this.body.velocity.y, 1.2);
        this.lastPosition.copy(recoveryPos);
        this.visualPosition.copy(recoveryPos);
        if (this.mesh) this.mesh.position.copy(recoveryPos);
        this.stuckTimer = 0;
        this.forceUnstickCooldown = 1.3;
        return;
      }

      if (this.stuckTimer > 1.5) {
        // Emergency nudge if still wedged in geometry.
        const nudge = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5);
        if (playerPos) {
          const toPlayer = new THREE.Vector3(
            playerPos.x - this.body.position.x,
            0,
            playerPos.z - this.body.position.z,
          );
          if (toPlayer.lengthSq() > 0.0001) {
            toPlayer.normalize();
            const sidestep = new THREE.Vector3(
              -toPlayer.z,
              0,
              toPlayer.x,
            ).multiplyScalar(this.orbitSign);
            nudge.copy(toPlayer).multiplyScalar(0.7).addScaledVector(sidestep, 0.8);
          }
        }
        if (nudge.lengthSq() < 0.0001) {
          nudge.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        }
        nudge.normalize();
        const nudgeDist = this.isBoss ? 2.8 : 1.1;
        this.body.position.x += nudge.x * nudgeDist;
        this.body.position.z += nudge.z * nudgeDist;
        const escapeSpeed = this.config.speed * this.speedMultiplier * (this.isBoss ? 0.9 : 0.65);
        this.body.velocity.x = nudge.x * escapeSpeed;
        this.body.velocity.z = nudge.z * escapeSpeed;
        this.stuckTimer = 0;
        this.forceUnstickCooldown = this.isBoss ? 0.8 : 0.2;
      } else if (this.stuckTimer > (this.isBoss ? 0.6 : 0.45)) {
        // Side-step instead of jump-spam for smoother monster movement.
        const side = new THREE.Vector3(
          this.orbitSign * this.body.velocity.z,
          0,
          -this.orbitSign * this.body.velocity.x,
        );
        if (side.lengthSq() < 0.001) {
          side.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        }
        side.normalize();
        const sideBoost = this.isBoss ? 3.6 : 5.2;
        this.body.velocity.x += side.x * sideBoost;
        this.body.velocity.z += side.z * sideBoost;

        if (this.isBoss) {
          this.body.velocity.y = Math.max(this.body.velocity.y, 1.1);
        }

        this.stuckTimer = this.isBoss ? 0.25 : 0.2;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  recoverFromArenaBounds() {
    const arenaClamp = 42;
    let wasClamped = false;

    if (this.body.position.x > arenaClamp) {
      this.body.position.x = arenaClamp;
      this.body.velocity.x = Math.min(0, this.body.velocity.x);
      wasClamped = true;
    } else if (this.body.position.x < -arenaClamp) {
      this.body.position.x = -arenaClamp;
      this.body.velocity.x = Math.max(0, this.body.velocity.x);
      wasClamped = true;
    }

    if (this.body.position.z > arenaClamp) {
      this.body.position.z = arenaClamp;
      this.body.velocity.z = Math.min(0, this.body.velocity.z);
      wasClamped = true;
    } else if (this.body.position.z < -arenaClamp) {
      this.body.position.z = -arenaClamp;
      this.body.velocity.z = Math.max(0, this.body.velocity.z);
      wasClamped = true;
    }

    if (wasClamped) {
      this.stuckTimer = 0;
    }
  }

  resolveStaticOverlap() {
    const radius = this.collisionRadius || this.config.size || 0.5;
    let bestAxis = null;
    let bestDepth = Infinity;
    let bestSign = 0;

    const staticBodies = this.getStaticObstacleBodies();
    for (const body of staticBodies) {
      const shape = body.shapes[0];
      if (!shape || !shape.halfExtents) continue;
      const half = shape.halfExtents;
      const dx = this.body.position.x - body.position.x;
      const dy = this.body.position.y - body.position.y;
      const dz = this.body.position.z - body.position.z;
      const overlapX = half.x + radius - Math.abs(dx);
      const overlapY = half.y + radius - Math.abs(dy);
      const overlapZ = half.z + radius - Math.abs(dz);

      if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) continue;

      const horizontalOverlap = Math.min(overlapX, overlapZ);
      if (horizontalOverlap <= 0.02) continue;

      if (overlapX < overlapZ) {
        if (overlapX < bestDepth) {
          bestDepth = overlapX;
          bestAxis = "x";
          bestSign = dx >= 0 ? 1 : -1;
        }
        continue;
      }

      if (overlapZ < bestDepth) {
        bestDepth = overlapZ;
        bestAxis = "z";
        bestSign = dz >= 0 ? 1 : -1;
      }
    }

    if (!bestAxis || !Number.isFinite(bestDepth)) return;

    const maxPush = this.isBoss ? 1.4 : 0.9;
    const push = Math.min(maxPush, bestDepth + 0.08) * bestSign;

    if (bestAxis === "x") {
      this.body.position.x += push;
      const minEscape = this.isBoss ? 3.1 : 2.0;
      this.body.velocity.x = bestSign * Math.max(minEscape, Math.abs(this.body.velocity.x));
    } else {
      this.body.position.z += push;
      const minEscape = this.isBoss ? 3.1 : 2.0;
      this.body.velocity.z = bestSign * Math.max(minEscape, Math.abs(this.body.velocity.z));
    }
  }

  getSafeRecoveryPosition(playerPos) {
    const spawnY = 5;
    const arenaClamp = 34;
    const centerAvoidRadius = this.isBoss ? 18 : 15;
    const candidate = new THREE.Vector3();

    if (playerPos) {
      const baseAngle = Math.random() * Math.PI * 2;
      for (let i = 0; i < 10; i++) {
        const angle = baseAngle + i * (Math.PI * 0.6);
        const radius = 20 + Math.random() * 10;
        candidate.set(
          THREE.MathUtils.clamp(
            playerPos.x + Math.cos(angle) * radius,
            -arenaClamp,
            arenaClamp,
          ),
          spawnY,
          THREE.MathUtils.clamp(
            playerPos.z + Math.sin(angle) * radius,
            -arenaClamp,
            arenaClamp,
          ),
        );

        const distToCenterSq = candidate.x * candidate.x + candidate.z * candidate.z;
        if (distToCenterSq > centerAvoidRadius * centerAvoidRadius) {
          return candidate.clone();
        }
      }
    }

    const fallbackAngle = Math.random() * Math.PI * 2;
    const fallbackRadius = this.isBoss ? 30 : 26;
    return new THREE.Vector3(
      Math.cos(fallbackAngle) * fallbackRadius,
      spawnY,
      Math.sin(fallbackAngle) * fallbackRadius,
    );
  }

  getCloseRecoveryPosition(playerPos) {
    const clamp = 34;
    const dist = this.isBoss ? 16 : 12;
    const angle = Math.random() * Math.PI * 2;
    const x = THREE.MathUtils.clamp(
      playerPos.x + Math.cos(angle) * dist,
      -clamp,
      clamp,
    );
    const z = THREE.MathUtils.clamp(
      playerPos.z + Math.sin(angle) * dist,
      -clamp,
      clamp,
    );
    const y = this.isFlyingType()
      ? Math.max(playerPos.y + 2.6, 3.8)
      : Math.max(this.collisionRadius || this.config.size || 0.5, 3.4);
    return new THREE.Vector3(x, y, z);
  }

  getStaticObstacleBodies() {
    if (!this.world) return [];

    if (!Number.isFinite(this.world.__enemyStaticRevision)) {
      this.world.__enemyStaticRevision = 0;
    }
    if (!Number.isFinite(this.world.__enemyStaticCacheRevision)) {
      this.world.__enemyStaticCacheRevision = -1;
    }

    if (
      !Array.isArray(this.world.__enemyStaticObstacleBodies) ||
      this.world.__enemyStaticCacheRevision !== this.world.__enemyStaticRevision
    ) {
      const staticBodies = [];
      for (const body of this.world.bodies) {
        if (!body || body.type !== Body.STATIC) continue;
        if (!body.shapes || body.shapes.length === 0) continue;
        if (body.collisionFilterGroup === 8) continue;

        const shape = body.shapes[0];
        if (!shape || !shape.halfExtents) continue;

        const half = shape.halfExtents;
        const isLargeFloorPiece =
          body.position.y <= 0.5 &&
          half.y >= 1.5 &&
          (half.x >= 10 || half.z >= 10);
        if (isLargeFloorPiece) continue;

        staticBodies.push(body);
      }
      this.world.__enemyStaticObstacleBodies = staticBodies;
      this.world.__enemyStaticCacheRevision = this.world.__enemyStaticRevision;
    }

    return this.world.__enemyStaticObstacleBodies;
  }

  getObstaclePressureAt(
    probeX,
    probeY,
    probeZ,
    radius = this.collisionRadius || this.config.size || 0.5,
  ) {
    const bodies = this.getStaticObstacleBodies();
    let pressure = 0;

    for (const body of bodies) {
      const shape = body.shapes[0];
      if (!shape || !shape.halfExtents) continue;
      const half = shape.halfExtents;

      const dy =
        Math.abs(probeY - body.position.y) -
        (half.y + this.config.size + 0.24);
      if (dy > 0) continue;

      const pad = radius + 0.12;
      const dx = Math.abs(probeX - body.position.x) - (half.x + pad);
      const dz = Math.abs(probeZ - body.position.z) - (half.z + pad);

      if (dx < 0 && dz < 0) {
        const depth = Math.min(-dx, -dz);
        pressure = Math.max(pressure, 1 + depth * 0.9);
        continue;
      }

      const edgeDist = Math.hypot(Math.max(0, dx), Math.max(0, dz));
      if (edgeDist < 0.95) {
        pressure = Math.max(pressure, ((0.95 - edgeDist) / 0.95) * 0.82);
      }
    }

    return pressure;
  }

  distanceToArenaCenterPath(targetPos) {
    if (!this.body || !targetPos) return Infinity;
    const ax = this.body.position.x;
    const az = this.body.position.z;
    const bx = targetPos.x;
    const bz = targetPos.z;

    const abx = bx - ax;
    const abz = bz - az;
    const abLenSq = abx * abx + abz * abz;
    if (abLenSq < 0.0001) {
      return Math.hypot(ax, az);
    }

    const t = THREE.MathUtils.clamp((-(ax * abx + az * abz)) / abLenSq, 0, 1);
    const cx = ax + abx * t;
    const cz = az + abz * t;
    return Math.hypot(cx, cz);
  }

  getBossDetourDirection(flatDir, playerPos) {
    if (!this.isBoss || !this.body || !playerPos) return null;

    const selfDist = Math.hypot(this.body.position.x, this.body.position.z);
    const playerDist = Math.hypot(playerPos.x, playerPos.z);
    if (selfDist < 6 || playerDist < 11) return null;

    const centerPathDistance = this.distanceToArenaCenterPath(playerPos);
    const detourRadius = 12.8;
    if (centerPathDistance > detourRadius) return null;

    this.detourDirection.set(this.body.position.x, 0, this.body.position.z);
    if (this.detourDirection.lengthSq() < 0.0001) return null;
    this.detourDirection.normalize();

    const tangent = new THREE.Vector3(
      -this.detourDirection.z,
      0,
      this.detourDirection.x,
    ).multiplyScalar(this.orbitSign);

    this.detourDirection
      .multiplyScalar(0.44)
      .addScaledVector(tangent, 0.84)
      .addScaledVector(flatDir, 0.2);

    if (this.detourDirection.lengthSq() < 0.0001) return null;
    this.detourDirection.normalize();
    return this.detourDirection;
  }

  pickSteeringDirection(baseDir, flatDir, distToPlayer, playerPos) {
    if (!this.body) return baseDir;

    const base = new THREE.Vector3(baseDir.x, 0, baseDir.z);
    if (base.lengthSq() < 0.0001) {
      base.copy(flatDir);
    }
    if (base.lengthSq() < 0.0001) {
      base.set(0, 0, 1);
    }
    base.normalize();

    const probeDist = this.isBoss
      ? THREE.MathUtils.clamp(distToPlayer * 0.32, 2.8, 5.8)
      : THREE.MathUtils.clamp(distToPlayer * 0.26, 1.35, 3.3);
    const probeY = this.body.position.y;
    const radius = (this.collisionRadius || this.config.size || 0.5) * (this.isBoss ? 1.08 : 1.0);
    const selfDistToCenter = Math.hypot(this.body.position.x, this.body.position.z);
    const playerDistToCenter = Math.hypot(playerPos.x, playerPos.z);
    const preferOutward = playerDistToCenter > 12 && selfDistToCenter < 20;
    const outward = new THREE.Vector3(this.body.position.x, 0, this.body.position.z);
    if (outward.lengthSq() > 0.0001) outward.normalize();

    let bestScore = -Infinity;
    let bestDir = base;
    const candidate = new THREE.Vector3();
    const evaluateCandidate = (rawAngle) => {
      const angle = rawAngle * this.orbitSign;
      candidate.copy(base).applyAxisAngle(Y_AXIS, angle);
      if (candidate.lengthSq() < 0.0001) return;
      candidate.normalize();

      const probeX = this.body.position.x + candidate.x * probeDist;
      const probeZ = this.body.position.z + candidate.z * probeDist;
      const pressure = this.getObstaclePressureAt(probeX, probeY, probeZ, radius);
      const directness = candidate.dot(flatDir);
      const momentum = candidate.dot(base);

      let score = directness * 1.28 + momentum * 0.34;
      score -= pressure * (this.isBoss ? 2.8 : 2.2);

      if (preferOutward) {
        score += candidate.dot(outward) * (this.isBoss ? 0.72 : 0.42);
      }

      if (this.stuckTimer > 0.45 && Math.abs(rawAngle) > 0.2) {
        score += 0.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDir = candidate.clone();
      }
    };

    for (const rawAngle of BASE_STEER_ANGLES) {
      evaluateCandidate(rawAngle);
    }
    if (this.stuckTimer > (this.isBoss ? 0.4 : 0.28)) {
      for (const rawAngle of HARD_STEER_ANGLES) {
        evaluateCandidate(rawAngle);
      }
    }

    return bestDir;
  }

  isHeadingIntoStaticObstacle(moveDir) {
    if (!this.body || !this.world || !moveDir || moveDir.lengthSq() < 0.0001) {
      return false;
    }

    const radius = this.collisionRadius || this.config.size || 0.5;
    const probeDist = this.isBoss ? 2.8 : 1.5;
    const probeX = this.body.position.x + moveDir.x * probeDist;
    const probeY = this.body.position.y;
    const probeZ = this.body.position.z + moveDir.z * probeDist;

    return this.getObstaclePressureAt(probeX, probeY, probeZ, radius) > 0.62;
  }

  updateBehavior(dt, playerPos, allEnemies = []) {
    const enemyPos = new THREE.Vector3(
      this.body.position.x,
      this.body.position.y,
      this.body.position.z,
    );
    const distToPlayer = enemyPos.distanceTo(playerPos);
    const dir = new THREE.Vector3()
      .subVectors(playerPos, enemyPos)
      .normalize();
    const flatDir = new THREE.Vector3(dir.x, 0, dir.z);
    if (flatDir.lengthSq() < 0.0001) {
      flatDir.set(0, 0, 1);
    } else {
      flatDir.normalize();
    }

    // 1. UNIQUE MOVEMENT PATTERNS
    let moveDir = flatDir.clone();

    if (this.type === "kamikaze") {
      // Zig-Zag approach
      const zigzag = Math.sin(this.time * 10) * 1.5;
      const right = new THREE.Vector3(flatDir.z, 0, -flatDir.x).normalize();
      moveDir.addScaledVector(right, zigzag);
    } else if (this.type === "harpy" || this.type === "sentinel") {
      // Swooping
      if (distToPlayer > 10) {
        moveDir.y += Math.sin(this.time * 2) * 0.5; // Bob up and down while approaching
      } else {
        moveDir.y -= 0.5; // Dive bomb when close
      }
    } else if (this.type === "arachnid" || this.type === "stalker") {
      // Scuttling: Stop and go?
      // Or just erratic side-shifts
      if (Math.random() < 0.02) {
        this.wanderDir = new THREE.Vector3(
          Math.random() - 0.5,
          0,
          Math.random() - 0.5,
        ).normalize();
      }
      if (this.wanderDir && Math.random() < 0.9) {
        moveDir.lerp(this.wanderDir, 0.3);
      }
    }

    // Keep a small orbit at close range to avoid pile-up jitter on player body.
    const preferredDist = this.isBoss ? 2.3 : 1.5;
    if (distToPlayer < preferredDist && this.type !== "kamikaze") {
      const orbit = new THREE.Vector3(-flatDir.z, 0, flatDir.x).multiplyScalar(
        this.orbitSign,
      );
      moveDir.lerp(orbit, 0.8);
    }

    const bossDetour = this.getBossDetourDirection(flatDir, playerPos);
    if (bossDetour) {
      const detourBlend = this.stuckTimer > 0.2 ? 0.8 : 0.62;
      moveDir.lerp(bossDetour, detourBlend);
    }

    // 4. Separation: prevent monster clumping/pile-up lag near player.
    let sepX = 0;
    let sepZ = 0;
    const separationRadius = this.isBoss ? 5.0 : 3.2;
    const separationRadiusSq = separationRadius * separationRadius;
    for (const other of allEnemies) {
      if (!other || other === this || other.isDead || !other.body) continue;
      const dx = this.body.position.x - other.body.position.x;
      const dz = this.body.position.z - other.body.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 0.0001 || distSq > separationRadiusSq) continue;

      const dist = Math.sqrt(distSq);
      const push = (separationRadius - dist) / separationRadius;
      sepX += (dx / dist) * push;
      sepZ += (dz / dist) * push;
    }
    const sepLen = Math.hypot(sepX, sepZ);
    if (sepLen > 0.001) {
      const sepStrength = this.isBoss ? 0.28 : 0.55;
      moveDir.x += (sepX / sepLen) * sepStrength;
      moveDir.z += (sepZ / sepLen) * sepStrength;
    }

    // Keep enemies from bunching at the center obstacle unless the player is there.
    const playerDistToCenter = Math.hypot(playerPos.x, playerPos.z);
    const selfDistToCenter = Math.hypot(this.body.position.x, this.body.position.z);
    if (playerDistToCenter > 12 && selfDistToCenter < 20) {
      const awayFromCenter = new THREE.Vector3(
        this.body.position.x,
        0,
        this.body.position.z,
      );
      if (awayFromCenter.lengthSq() > 0.0001) {
        awayFromCenter.normalize();
        const centerPressure = THREE.MathUtils.clamp((20 - selfDistToCenter) / 20, 0, 1);
        const avoidStrength = this.isBoss ? 1.0 : 0.6;
        moveDir.addScaledVector(awayFromCenter, centerPressure * avoidStrength);
      } else {
        moveDir.x += this.orbitSign * 0.5;
      }
    }

    // Better Anti-Stuck:
    if (this.stuckTimer > 0.5) {
      // If we end up here, we are pushing against something.
      // Try to slide along the obstacle:
      // Rotate moveDir by 90 degrees
      moveDir.applyAxisAngle(Y_AXIS, Math.PI / 2);
    }

    moveDir = this.pickSteeringDirection(moveDir, flatDir, distToPlayer, playerPos);

    if (this.isHeadingIntoStaticObstacle(moveDir)) {
      const emergencyTurn = (this.isBoss ? 0.92 : 1.2) * this.orbitSign;
      moveDir.applyAxisAngle(Y_AXIS, emergencyTurn);
    }

    // Smooth steering for bosses/heavy units to avoid twitchy heading changes.
    if (this.isBoss || this.type === "titan" || this.type === "brute") {
      const steerBlend = Math.min(1, dt * 3.6);
      this.smoothedMoveDir.lerp(moveDir, steerBlend);
      if (this.smoothedMoveDir.lengthSq() > 0.0001) {
        moveDir.copy(this.smoothedMoveDir);
      }
    }

    // 2. APPLY MOVEMENT (Updated)
    const speed = this.config.speed * this.speedMultiplier;
    if (moveDir.lengthSq() < 0.0001) {
      moveDir.copy(flatDir);
    }
    moveDir.normalize();

    if (this.body.sleepState > 0) {
      this.body.wakeUp();
    }

    const isFlying = this.isFlyingType();
    const minDistanceFactor = this.isBoss ? 0.18 : 0.35;
    let distanceFactor =
      this.type === "kamikaze"
        ? 1
        : THREE.MathUtils.clamp(
            (distToPlayer - 0.5) / 2.3,
            minDistanceFactor,
            1.05,
          );

    if (this.isBoss) {
      // Slow the boss when close so he doesn't jitter by constantly overshooting the player.
      const stopRadius = preferredDist + 0.5;
      const slowRadius = preferredDist + 4.2;
      const arrivalFactor = THREE.MathUtils.clamp(
        (distToPlayer - stopRadius) / Math.max(0.5, slowRadius - stopRadius),
        0.08,
        1,
      );
      distanceFactor = Math.min(distanceFactor, arrivalFactor);
    }

    const targetVx = moveDir.x * speed * distanceFactor;
    const targetVz = moveDir.z * speed * distanceFactor;
    const baseResponse =
      this.type === "boss_warlord"
        ? 8
        : this.type === "titan" || this.type === "brute"
          ? 7
          : 9;
    let response = this.isBoss
      ? Math.max(4.8, baseResponse * 0.7)
      : baseResponse;
    if (this.stuckTimer > 0.45) {
      response += this.isBoss ? 1.0 : 0.7;
    }
    const blend = Math.min(1, dt * response);
    this.body.velocity.x += (targetVx - this.body.velocity.x) * blend;
    this.body.velocity.z += (targetVz - this.body.velocity.z) * blend;

    if (isFlying) {
      const desiredY = playerPos.y + (this.type === "harpy" ? 3.2 : 2.2);
      const yError = desiredY - this.body.position.y;
      const targetVy = THREE.MathUtils.clamp(yError * 2.0, -6, 6);
      this.body.velocity.y += (targetVy - this.body.velocity.y) * Math.min(1, dt * 4);
    }

    const maxHorizontal = speed * (isFlying ? 1.25 : this.isBoss ? 1.25 : 1.1);
    const currentHorizontal = Math.hypot(this.body.velocity.x, this.body.velocity.z);
    if (currentHorizontal > maxHorizontal) {
      const clampScale = maxHorizontal / currentHorizontal;
      this.body.velocity.x *= clampScale;
      this.body.velocity.z *= clampScale;
    }

    // 3. LOOK AT PLAYER
    const facingDir = new THREE.Vector3(
      this.body.velocity.x,
      0,
      this.body.velocity.z,
    );
    if (
      (this.isBoss || this.type === "titan" || this.type === "brute") &&
      this.smoothedMoveDir.lengthSq() > 0.0001
    ) {
      facingDir.lerp(this.smoothedMoveDir, 0.65);
    }
    if (facingDir.lengthSq() > 0.0001) {
      facingDir.normalize();
      this.targetYaw = Math.atan2(facingDir.x, facingDir.z);
    }

    const yawDelta = this.normalizeAngle(this.targetYaw - this.baseYaw);
    const turnRate = this.isBoss ? 6.2 : 10;
    this.baseYaw += yawDelta * Math.min(1, dt * turnRate);
  }

  updateAnimation(dt, velocity) {
    this.time += dt;
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    const isMoving = horizontalSpeed > 0.2;

    // 1. Tilt into movement (Visual Juice)
    // Calculate lean based on velocity
    const targetTiltX = THREE.MathUtils.clamp(velocity.z * 0.015, -0.25, 0.25);
    const targetTiltZ = THREE.MathUtils.clamp(-velocity.x * 0.015, -0.25, 0.25);

    this.animState.tiltX += (targetTiltX - this.animState.tiltX) * 5 * dt;
    this.animState.tiltZ += (targetTiltZ - this.animState.tiltZ) * 5 * dt;

    this.mesh.rotation.order = "YXZ";
    this.mesh.rotation.y = this.baseYaw;
    this.mesh.rotation.x = this.animState.tiltX;
    this.mesh.rotation.z = this.animState.tiltZ;

    // 2. Bobbing / Breathing
    const speedRatio = THREE.MathUtils.clamp(
      horizontalSpeed / (this.config.speed * this.speedMultiplier || 1),
      0,
      1.5,
    );
    let bobFreq = this.type === "kamikaze" ? 12 + speedRatio * 6 : 4 + speedRatio * 5;
    let bobAmp =
      this.type === "harpy" ? 0.01 + speedRatio * 0.03 : 0.02 + speedRatio * 0.08;
    if (this.isBoss || this.type === "titan" || this.type === "brute") {
      bobFreq *= 0.78;
      bobAmp *= 0.42;
    }
    this.mesh.position.y += Math.sin(this.time * bobFreq) * bobAmp;

    // 3. Type-Specific Procedurals
    if ((this.type === "arachnid" || this.type === "stalker") && this.mesh.userData.legs) {
      const legs = this.mesh.userData.legs;
      const runFreq = 8 + speedRatio * 14;

      legs.forEach((leg, i) => {
        // Alternate leg movement
        const offset = i % 2 === 0 ? 0 : Math.PI;
        const angle = Math.sin(this.time * runFreq + offset) * 0.5;

        // Rotate the pivot (y-axis)
        if (isMoving) {
          leg.pivot.rotation.y = leg.baseRot + angle * 0.5;
          // Lift leg slightly
          leg.pivot.rotation.z =
            Math.abs(Math.sin(this.time * runFreq + offset)) * 0.2;
        } else {
          // Idle breathing
          leg.pivot.rotation.y =
            leg.baseRot + Math.sin(this.time * 2 + i) * 0.05;
          leg.pivot.rotation.z = 0;
        }
      });
    } else if (this.type === "specter") {
      // Floating/Flying bob + PHASE (Transparency) + GLOW PULSE
      this.mesh.position.y += Math.sin(this.time * 3) * 0.05;

      // Phase effect: oscillate opacity + pulsing glow
      this.mesh.traverse((c) => {
        if (c.isMesh && c.material.transparent) {
          // Pulse opacity between 0.45 and 0.9
          const baseOpacity =
            Number.isFinite(c.userData?.baseOpacity)
              ? c.userData.baseOpacity
              : c.material.opacity;
          c.userData.baseOpacity = baseOpacity;
          c.material.opacity = THREE.MathUtils.clamp(
            baseOpacity + Math.sin(this.time * 2) * 0.16,
            0.45,
            0.9,
          );

          // Pulsing glow effect on emissive materials
          if (c.material.emissive) {
            c.material.emissiveIntensity = 0.6 + Math.sin(this.time * 4) * 0.4;
          }
        }
      });

      // Rotate wisps if they exist
      if (this.mesh.userData.wisps) {
        this.mesh.userData.wisps.forEach((wisp) => {
          wisp.rotation.y += dt * wisp.userData.rotSpeed;
          if (Number.isFinite(wisp.userData?.orbitRadius)) {
            const orbitSpeed =
              (wisp.userData.rotSpeed || 0.2) *
              (0.68 + horizontalSpeed * 0.03);
            wisp.userData.orbitAngle += dt * orbitSpeed;
            const radius = wisp.userData.orbitRadius;
            wisp.position.x = Math.cos(wisp.userData.orbitAngle) * radius;
            wisp.position.z = Math.sin(wisp.userData.orbitAngle) * radius;

            const baseY =
              Number.isFinite(wisp.userData.baseY) ? wisp.userData.baseY : 1.2;
            const phase =
              Number.isFinite(wisp.userData.phase) ? wisp.userData.phase : 0;
            wisp.position.y = baseY + Math.sin(this.time * 2.8 + phase) * 0.05;
          }
        });
      }

      // Animate tatters in orbit if they exist
      if (this.mesh.userData.tatters) {
        this.mesh.userData.tatters.forEach((tatter) => {
          tatter.userData.angle += dt * tatter.userData.rotSpeed;
          const radius = tatter.userData.radius || 0.4;
          const sway = tatter.userData.sway || 0;
          const flutter = Math.sin(this.time * 3 + sway) * 0.03;
          const orbitRadius = radius + flutter;
          tatter.position.x = Math.cos(tatter.userData.angle) * orbitRadius;
          tatter.position.z = Math.sin(tatter.userData.angle) * orbitRadius;

          const baseY =
            Number.isFinite(tatter.userData.baseY)
              ? tatter.userData.baseY
              : tatter.position.y;
          tatter.position.y = baseY + Math.sin(this.time * 4.5 + sway) * 0.025;
          tatter.rotation.z = Math.sin(this.time * 5.0 + sway) * 0.08;
        });
      }

      if (this.mesh.userData.runeRings) {
        this.mesh.userData.runeRings.forEach((ring, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          ring.rotation.z += dt * (0.45 + i * 0.08) * dir;
          ring.rotation.y += dt * 0.2 * dir;
        });
      }
    } else if (this.type === "harpy" || this.type === "sentinel") {
      const wings = this.mesh.userData.wings;
      const flap = Math.sin(this.time * (12 + speedRatio * 8)) * 0.55;
      if (wings) {
        wings.left.rotation.z = 0.2 + flap;
        wings.left.rotation.y = Math.PI + flap * 0.12;
        wings.right.rotation.z = -0.2 - flap;
        wings.right.rotation.y = -flap * 0.12;
      }
      this.mesh.rotation.x = this.animState.tiltX + Math.sin(this.time * 2.4) * 0.06;
      this.mesh.rotation.z = this.animState.tiltZ + Math.sin(this.time * 4.1) * 0.04;
    } else if (this.type === "kamikaze") {
      const pulse = 1.0 + Math.sin(this.time * (10 + speedRatio * 6)) * 0.1;
      this.mesh.scale.set(
        this.baseModelScale.x * pulse,
        this.baseModelScale.y * pulse,
        this.baseModelScale.z * pulse,
      );
      this.mesh.rotation.z = Math.sin(this.time * 12) * 0.05;
      this.mesh.rotation.x = this.animState.tiltX + Math.sin(this.time * 9) * 0.08;
    } else if (this.type === "void_reaper") {
      const strideFreq = 2.7 + speedRatio * 3.0;
      const stride = Math.sin(this.time * strideFreq) * 0.18;
      const cloakWave = Math.sin(this.time * 3.4) * 0.035;
      this.mesh.position.y += cloakWave;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.9) * 0.018;

      if (this.mesh.userData.leftLeg) this.mesh.userData.leftLeg.rotation.x = stride;
      if (this.mesh.userData.rightLeg) this.mesh.userData.rightLeg.rotation.x = -stride;
      if (this.mesh.userData.leftArm) {
        this.mesh.userData.leftArm.rotation.x = -stride * 1.2;
        this.mesh.userData.leftArm.rotation.z = -0.08 + Math.sin(this.time * 2.1) * 0.03;
      }
      if (this.mesh.userData.rightArm) {
        this.mesh.userData.rightArm.rotation.x = stride * 1.2;
        this.mesh.userData.rightArm.rotation.z = 0.08 - Math.sin(this.time * 2.1) * 0.03;
      }

      if (this.mesh.userData.cloakStrips) {
        this.mesh.userData.cloakStrips.forEach((strip, i) => {
          const phase = strip.userData.phase || i * 0.6;
          const baseY = strip.userData.baseY || strip.position.y;
          const angle = strip.userData.angle || 0;
          const radius = strip.userData.radius || 0.42;
          strip.userData.angle = angle + dt * (0.14 + i * 0.006);
          strip.position.x = Math.cos(strip.userData.angle) * radius;
          strip.position.z = Math.sin(strip.userData.angle) * radius;
          strip.position.y = baseY + Math.sin(this.time * 4.0 + phase) * 0.026;
          strip.rotation.z = Math.sin(this.time * 3.1 + phase) * 0.09;
        });
      }

      if (this.mesh.userData.runeRings) {
        this.mesh.userData.runeRings.forEach((ring, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          ring.rotation.z += dt * (0.45 + i * 0.1) * dir;
          ring.rotation.y += dt * 0.26 * dir;
        });
      }
    } else if (this.type === "nightfang") {
      const strideFreq = 2.9 + speedRatio * 3.2;
      const stride = Math.sin(this.time * strideFreq) * 0.2;
      const cloakWave = Math.sin(this.time * 3.8) * 0.03;
      this.mesh.position.y += cloakWave;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.7) * 0.014;

      if (this.mesh.userData.leftLeg) this.mesh.userData.leftLeg.rotation.x = stride;
      if (this.mesh.userData.rightLeg) this.mesh.userData.rightLeg.rotation.x = -stride;

      if (this.mesh.userData.leftArm) {
        this.mesh.userData.leftArm.rotation.x = -stride * 1.05;
        this.mesh.userData.leftArm.rotation.z = -0.1 + Math.sin(this.time * 2.2) * 0.025;
      }
      if (this.mesh.userData.rightArm) {
        this.mesh.userData.rightArm.rotation.x = stride * 1.05;
        this.mesh.userData.rightArm.rotation.z = 0.1 - Math.sin(this.time * 2.2) * 0.025;
      }

      if (this.mesh.userData.capePanels) {
        this.mesh.userData.capePanels.forEach((panel, i) => {
          const phase = panel.userData.phase || i * 0.4;
          const baseY = panel.userData.baseY || panel.position.y;
          const baseAngle = panel.userData.angle || 0;
          const radius = panel.userData.radius || 0.48;
          const sway = Math.sin(this.time * 3.0 + phase) * 0.08;
          panel.position.x = Math.sin(baseAngle + sway) * radius;
          panel.position.z = -0.52 - Math.cos(baseAngle + sway) * 0.18;
          panel.position.y = baseY + Math.sin(this.time * 4.2 + phase) * 0.028;
          panel.rotation.y = Math.PI + (baseAngle + sway) * 0.55;
          panel.rotation.z = Math.sin(this.time * 3.6 + phase) * 0.06;
        });
      }

      if (this.mesh.userData.runeRings) {
        this.mesh.userData.runeRings.forEach((ring, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          ring.rotation.z += dt * (0.42 + i * 0.08) * dir;
          ring.rotation.y += dt * 0.22 * dir;
        });
      }
    } else if (this.type === "rift_judicator") {
      const strideFreq = 2.6 + speedRatio * 3.6;
      const stride = Math.sin(this.time * strideFreq) * 0.19;
      const bob = Math.sin(this.time * 3.3) * 0.024;
      this.mesh.position.y += bob;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.6) * 0.012;

      if (this.mesh.userData.leftLeg) this.mesh.userData.leftLeg.rotation.x = stride;
      if (this.mesh.userData.rightLeg) this.mesh.userData.rightLeg.rotation.x = -stride;
      if (this.mesh.userData.leftArm) {
        this.mesh.userData.leftArm.rotation.x = -stride * 1.12;
        this.mesh.userData.leftArm.rotation.z = -0.08 + Math.sin(this.time * 2.0) * 0.026;
      }
      if (this.mesh.userData.rightArm) {
        this.mesh.userData.rightArm.rotation.x = stride * 1.12;
        this.mesh.userData.rightArm.rotation.z = 0.08 - Math.sin(this.time * 2.0) * 0.026;
      }

      if (this.mesh.userData.capePanels) {
        this.mesh.userData.capePanels.forEach((panel, i) => {
          const phase = panel.userData.phase || i * 0.5;
          const baseY = panel.userData.baseY || panel.position.y;
          const baseAngle = panel.userData.angle || 0;
          const radius = panel.userData.radius || 0.48;
          const sway = Math.sin(this.time * 3.2 + phase) * 0.07;
          panel.position.x = Math.sin(baseAngle + sway) * radius;
          panel.position.z = -0.54 - Math.cos(baseAngle + sway) * 0.18;
          panel.position.y = baseY + Math.sin(this.time * 4.1 + phase) * 0.028;
          panel.rotation.y = Math.PI + (baseAngle + sway) * 0.58;
          panel.rotation.z = Math.sin(this.time * 3.5 + phase) * 0.06;
        });
      }

      if (this.mesh.userData.wingBlades) {
        this.mesh.userData.wingBlades.forEach((blade, i) => {
          const side = blade.userData.side || 1;
          const phase = blade.userData.phase || i * 0.35;
          const baseX = blade.userData.baseX || blade.position.x;
          const baseY = blade.userData.baseY || blade.position.y;
          const baseZ = blade.userData.baseZ || blade.position.z;
          blade.position.x = baseX + side * Math.sin(this.time * 2.6 + phase) * 0.07;
          blade.position.y = baseY + Math.sin(this.time * 3.1 + phase) * 0.05;
          blade.position.z = baseZ + Math.cos(this.time * 2.4 + phase) * 0.04;
          blade.rotation.y = side * (0.2 + Math.sin(this.time * 2.8 + phase) * 0.16);
          blade.rotation.z = side * (0.08 + Math.sin(this.time * 3.3 + phase) * 0.12);
        });
      }

      if (this.mesh.userData.runeRings) {
        this.mesh.userData.runeRings.forEach((ring, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          ring.rotation.z += dt * (0.5 + i * 0.12) * dir;
          ring.rotation.y += dt * 0.24 * dir;
        });
      }
    } else if (this.type === "eclipse_warden") {
      const strideFreq = 2.7 + speedRatio * 3.6;
      const stride = Math.sin(this.time * strideFreq) * 0.2;
      const bob = Math.sin(this.time * 3.2) * 0.024;
      this.mesh.position.y += bob;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.6) * 0.012;

      if (this.mesh.userData.leftLeg) this.mesh.userData.leftLeg.rotation.x = stride;
      if (this.mesh.userData.rightLeg) this.mesh.userData.rightLeg.rotation.x = -stride;

      if (this.mesh.userData.leftArm) {
        this.mesh.userData.leftArm.rotation.x = -stride * 1.08;
        this.mesh.userData.leftArm.rotation.z = -0.1 + Math.sin(this.time * 2.2) * 0.028;
      }
      if (this.mesh.userData.rightArm) {
        this.mesh.userData.rightArm.rotation.x = stride * 1.08;
        this.mesh.userData.rightArm.rotation.z = 0.1 - Math.sin(this.time * 2.2) * 0.028;
      }

      if (this.mesh.userData.mantlePanels) {
        this.mesh.userData.mantlePanels.forEach((panel, i) => {
          const phase = panel.userData.phase || i * 0.45;
          const baseY = panel.userData.baseY || panel.position.y;
          const angle = panel.userData.angle || 0;
          const radius = panel.userData.radius || 0.48;
          const orbit = angle + dt * (0.16 + i * 0.006);
          panel.userData.angle = orbit;
          panel.position.x = Math.cos(orbit) * radius;
          panel.position.z = Math.sin(orbit) * radius - 0.08;
          panel.position.y = baseY + Math.sin(this.time * 4.0 + phase) * 0.03;
          panel.rotation.y = orbit + Math.PI / 2;
          panel.rotation.z = Math.sin(this.time * 3.3 + phase) * 0.08;
        });
      }

      if (this.mesh.userData.orbitShards) {
        this.mesh.userData.orbitShards.forEach((shard, i) => {
          const radius = shard.userData.radius || 0.9;
          const baseY = shard.userData.baseY || shard.position.y;
          const phase = shard.userData.phase || i * 0.3;
          shard.userData.angle = (shard.userData.angle || 0) + dt * (0.8 + i * 0.08);
          const angle = shard.userData.angle;
          shard.position.x = Math.cos(angle) * radius;
          shard.position.z = Math.sin(angle) * radius;
          shard.position.y = baseY + Math.sin(this.time * 4.2 + phase) * 0.06;
          shard.rotation.y = angle + phase;
          shard.rotation.z = Math.sin(this.time * 3.6 + phase) * 0.22;
        });
      }

      if (this.mesh.userData.runeRings) {
        this.mesh.userData.runeRings.forEach((ring, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          ring.rotation.z += dt * (0.48 + i * 0.1) * dir;
          ring.rotation.y += dt * 0.24 * dir;
        });
      }
    } else if (this.type === "boss_warlord") {
      const strideFreq = 2.4 + speedRatio * 3.2;
      const stridePhase = this.time * strideFreq;
      const stride = Math.sin(stridePhase) * 0.2;
      const armSwing = Math.sin(this.time * (2.5 + speedRatio * 3)) * 0.25;
      const lift = (1 - Math.cos(stridePhase * 2)) * 0.5;
      this.mesh.position.y += lift * 0.02;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.8) * 0.012;

      if (this.mesh.userData.leftLeg) {
        this.mesh.userData.leftLeg.rotation.x = stride;
      }
      if (this.mesh.userData.rightLeg) {
        this.mesh.userData.rightLeg.rotation.x = -stride;
      }
      if (this.mesh.userData.leftArm) {
        this.mesh.userData.leftArm.rotation.x = -armSwing;
      }
      if (this.mesh.userData.rightArm) {
        this.mesh.userData.rightArm.rotation.x = armSwing;
      }
    } else if (this.type === "titan" || this.type === "brute") {
      // Heavy Stomp (Slower, deeper bob)
      const stomp = Math.abs(Math.sin(this.time * (3.5 + speedRatio * 2))); // 0 to 1
      this.mesh.position.y += stomp * 0.08;
      this.mesh.rotation.y = this.baseYaw + Math.sin(this.time * 1.5) * 0.06;
      const stride = Math.sin(this.time * (2.2 + speedRatio * 2.5)) * 0.25;
      if (this.mesh.userData.leftLeg) this.mesh.userData.leftLeg.rotation.x = stride;
      if (this.mesh.userData.rightLeg)
        this.mesh.userData.rightLeg.rotation.x = -stride;
      if (this.mesh.userData.leftArm) this.mesh.userData.leftArm.rotation.x = -stride;
      if (this.mesh.userData.rightArm)
        this.mesh.userData.rightArm.rotation.x = stride;
    }
  }

  takeDamage(amount) {
    this.health -= amount;

    // Flash White
    if (!this.flashing && this.mesh) {
      this.flashing = true;
      const oldMats = [];
      this.mesh.traverse((c) => {
        if (c.isMesh) {
          oldMats.push({ mesh: c, mat: c.material });
          c.material = c.material.clone();
          if (c.material.emissive) {
            c.material.emissive.setHex(0xffffff);
            if (c.material.emissiveIntensity !== undefined) {
              c.material.emissiveIntensity = 1;
            }
          } else {
            c.material.color.setHex(0xffffff);
          }
        }
      });

      setTimeout(() => {
        if (!this.isDead) {
          oldMats.forEach((d) => {
            d.mesh.material = d.mat; // Restore
          });
        }
        this.flashing = false;
      }, 50);
    }

    if (this.health <= 0) this.isDead = true;
  }

  dispose() {
    if (!this.mesh) return;

    this.mesh.traverse((child) => {
      if (!child.isMesh) return;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          if (mat && mat.dispose) mat.dispose();
        });
      } else if (child.material && child.material.dispose) {
        child.material.dispose();
      }
    });

    this.mesh = null;
  }

  setSpeedMultiplier(multiplier = 1.0) {
    this.speedMultiplier = THREE.MathUtils.clamp(multiplier, 0.6, 2.6);
  }

  normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
}

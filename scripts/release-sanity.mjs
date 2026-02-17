import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { World, Body, Box, Vec3 } from "cannon-es";
import { Enemy } from "../src/entities/Enemy.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function countWaveBossProfiles(source) {
  const startToken = "const WAVE_BOSS_PROFILES = [";
  const start = source.indexOf(startToken);
  if (start < 0) return 0;

  const end = source.indexOf("];", start);
  if (end < 0) return 0;

  const block = source.slice(start, end);
  const matches = block.match(/\bname:\s*"/g);
  return matches ? matches.length : 0;
}

function parseTotalWaves(source) {
  const match = source.match(/const TOTAL_WAVES = (\d+);/);
  return match ? Number(match[1]) : NaN;
}

function runEnemyCollisionSanity() {
  const scene = new THREE.Scene();
  const world = new World();
  const samples = [
    ["boss_warlord", true],
    ["void_reaper", true],
    ["nightfang", true],
    ["rift_judicator", true],
    ["eclipse_warden", true],
    ["titan", true],
    ["brute", false],
    ["arachnid", false],
    ["stalker", false],
    ["harpy", false],
    ["sentinel", false],
    ["specter", false],
    ["kamikaze", false],
  ];

  for (const [type, isBoss] of samples) {
    const enemy = new Enemy(scene, world, new THREE.Vector3(0, 5, 0), type, isBoss);
    enemy.mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(enemy.mesh);
    const size = bounds.getSize(new THREE.Vector3());
    const visualRadius = Math.max(size.x, size.z) * 0.5;
    const collisionRadius = enemy.collisionRadius;

    assert(
      Number.isFinite(collisionRadius) && collisionRadius > 0,
      `Invalid collision radius for '${type}'`,
    );

    if (Number.isFinite(visualRadius) && visualRadius > 0.01) {
      const ratio = collisionRadius / visualRadius;
      assert(
        ratio >= 0.45 && ratio <= 0.9,
        `Collision mismatch for '${type}' (ratio=${ratio.toFixed(2)})`,
      );
    }

    if (enemy.body) world.removeBody(enemy.body);
  }
}

function runBossSteeringSanity() {
  const scene = new THREE.Scene();
  const world = new World();
  const blocker = new Body({
    type: Body.STATIC,
    shape: new Box(new Vec3(2.6, 2.6, 2.6)),
    position: new Vec3(0, 2.6, 0),
  });
  world.addBody(blocker);

  const boss = new Enemy(
    scene,
    world,
    new THREE.Vector3(0, 5, -12),
    "boss_warlord",
    true,
  );

  const playerPos = new THREE.Vector3(0, 5, 12);
  for (let i = 0; i < 12; i++) {
    boss.updateBehavior(1 / 30, playerPos, [boss]);
    world.step(1 / 60, 1 / 30, 2);
  }

  const steeringDir = new THREE.Vector3(
    boss.body.velocity.x,
    0,
    boss.body.velocity.z,
  );
  const hasLateralSteer = Math.abs(boss.body.velocity.x) > 0.22;
  if (steeringDir.lengthSq() > 0.0001) {
    steeringDir.normalize();
  }
  const headingBlocked = steeringDir.lengthSq() > 0.0001
    ? boss.isHeadingIntoStaticObstacle(steeringDir)
    : true;

  assert(
    hasLateralSteer || !headingBlocked,
    "Boss steering failed to detour around a frontal blocker",
  );

  if (boss.body) world.removeBody(boss.body);
  world.removeBody(blocker);
}

function main() {
  const gamePath = path.resolve("src/core/Game.js");
  const gameSource = fs.readFileSync(gamePath, "utf8");

  const totalWaves = parseTotalWaves(gameSource);
  assert(Number.isInteger(totalWaves), "Could not parse TOTAL_WAVES from Game.js");
  assert(totalWaves === 6, `Expected TOTAL_WAVES=6, found ${totalWaves}`);

  const bossProfiles = countWaveBossProfiles(gameSource);
  assert(
    bossProfiles === totalWaves,
    `Boss profile count (${bossProfiles}) must match TOTAL_WAVES (${totalWaves})`,
  );

  runEnemyCollisionSanity();
  runBossSteeringSanity();

  console.log("Release sanity checks passed.");
}

main();

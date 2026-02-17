import * as THREE from "three";
import { Body } from "cannon-es";
import { Game } from "../src/core/Game.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createClassList() {
  const classes = new Set();
  return {
    add(...names) {
      names.forEach((name) => classes.add(name));
    },
    remove(...names) {
      names.forEach((name) => classes.delete(name));
    },
    contains(name) {
      return classes.has(name);
    },
  };
}

function createElement(id) {
  return {
    id,
    style: {},
    innerText: "",
    textContent: "",
    classList: createClassList(),
    children: {},
    offsetWidth: 0,
    querySelector(selector) {
      return this.children[selector] || null;
    },
  };
}

function installDomStubs() {
  const elements = new Map();
  const ids = [
    "wave-message-overlay",
    "wave-title",
    "wave-subtitle",
    "wave-number",
    "enemies-remaining",
    "boss-health-bar",
    "boss-health-fill",
    "game-over-screen",
    "final-score",
    "hit-marker",
    "crosshair",
  ];
  ids.forEach((id) => elements.set(id, createElement(id)));

  const gameOver = elements.get("game-over-screen");
  gameOver.children.h1 = createElement("go-title");
  gameOver.children.button = createElement("go-button");

  const bossBar = elements.get("boss-health-bar");
  bossBar.children[".boss-health-text"] = createElement("boss-health-text");

  globalThis.document = {
    getElementById(id) {
      return elements.get(id) || null;
    },
  };

  let reloadCount = 0;
  globalThis.window = {
    location: {
      reload() {
        reloadCount++;
      },
    },
  };

  return {
    elements,
    getReloadCount: () => reloadCount,
  };
}

function withImmediateTimeouts(fn) {
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (cb) => {
    cb();
    return 1;
  };
  globalThis.clearTimeout = () => {};
  try {
    fn();
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
}

function createBossProfiles() {
  return [
    { name: "Obsidian Titan", type: "titan" },
    { name: "Void Reaper", type: "void_reaper" },
    { name: "Nightfang Executioner", type: "nightfang" },
    { name: "Rift Judicator", type: "rift_judicator" },
    { name: "Eclipse Warden", type: "eclipse_warden" },
    { name: "Abyss Sovereign", type: "boss_warlord", specialFinal: true },
  ];
}

function runWaveLifecycleChecks() {
  const waveBossProfiles = createBossProfiles();

  const startCtx = {
    totalWaves: 6,
    waveBossProfiles,
    difficultyTuning: { spawnRateScale: 1.0 },
    uiCache: { remainingEnemies: null },
    level: {
      setArenaPhase(phase) {
        startCtx.lastArenaPhase = phase;
      },
    },
    showWaveOverlay() {
      startCtx.overlayShown = true;
    },
    updateRemainingEnemiesHUD() {
      startCtx.remainingHudUpdated = true;
    },
    buildWaveSpawnCycle: Game.prototype.buildWaveSpawnCycle,
    getWaveComposition: Game.prototype.getWaveComposition,
    triggerVictory() {
      startCtx.victoryTriggered = true;
    },
  };

  Game.prototype.startWave.call(startCtx, 4);
  assert(startCtx.waveNumber === 4, "startWave should set the requested wave number");
  assert(startCtx.waveState === "STARTING", "startWave should set waveState STARTING");
  assert(startCtx.enemiesSpawnedThisWave === 0, "startWave should reset spawned counter");
  assert(startCtx.enemiesKilledThisWave === 0, "startWave should reset killed counter");
  assert(Array.isArray(startCtx.waveSpawnCycle) && startCtx.waveSpawnCycle.length > 0, "startWave should create a spawn cycle");
  assert(startCtx.lastArenaPhase === 4, "startWave should update arena phase");
  assert(startCtx.overlayShown === true, "startWave should show wave overlay");
  assert(startCtx.remainingHudUpdated === true, "startWave should refresh remaining HUD");

  Game.prototype.startWave.call(startCtx, 99);
  assert(startCtx.victoryTriggered === true, "startWave should trigger victory above TOTAL_WAVES");

  const completeCtx = {
    waveState: "ACTIVE",
    waveNumber: 4,
    totalWaves: 6,
    waveBossProfiles,
    waveOverlayTimeoutId: null,
    audio: {
      playWaveComplete() {
        completeCtx.playedWaveComplete = true;
      },
    },
    getBossProfileForWave: Game.prototype.getBossProfileForWave,
    hideWaveOverlay() {
      completeCtx.overlayHidden = true;
    },
    triggerVictory() {
      completeCtx.victoryTriggered = true;
    },
  };

  Game.prototype.completeWave.call(completeCtx);
  assert(completeCtx.playedWaveComplete === true, "completeWave should play complete audio");
  assert(completeCtx.waveState === "COMPLETE", "completeWave should set COMPLETE for non-final wave");
  assert(completeCtx.victoryTriggered !== true, "completeWave should not auto-victory on non-final wave");

  const finalCtx = {
    waveState: "ACTIVE",
    waveNumber: 6,
    totalWaves: 6,
    waveBossProfiles,
    waveOverlayTimeoutId: null,
    victoryTriggered: false,
    overlayHidden: false,
    audio: {
      playWaveComplete() {
        finalCtx.playedWaveComplete = true;
      },
    },
    getBossProfileForWave: Game.prototype.getBossProfileForWave,
    hideWaveOverlay() {
      this.overlayHidden = true;
    },
    triggerVictory() {
      this.victoryTriggered = true;
    },
  };

  withImmediateTimeouts(() => {
    Game.prototype.completeWave.call(finalCtx);
  });
  assert(finalCtx.waveState === "VICTORY", "completeWave should set VICTORY state on final wave");
  assert(finalCtx.victoryTriggered === true, "completeWave should trigger victory callback on final wave");
}

function runBossSpawnCheck() {
  const scene = new THREE.Scene();
  const world = {
    bodies: [],
    addBody(body) {
      this.bodies.push(body);
    },
    removeBody(body) {
      this.bodies = this.bodies.filter((entry) => entry !== body);
    },
  };

  const waveBossProfiles = createBossProfiles();
  const ctx = {
    scene,
    world,
    enemies: [],
    waveNumber: 3,
    enemiesSpawnedThisWave: 0,
    enemiesKilledThisWave: 0,
    waveSpawnCycle: [],
    waveBossProfiles,
    difficultyTuning: { enemyHealthScale: 1.0, enemySpeedScale: 1.0 },
    player: { body: { position: { x: 0, y: 2, z: 30 } } },
    audio: {
      playBossRoar() {
        ctx.bossRoarPlayed = true;
      },
      playMonsterGrowl() {},
    },
    getWaveComposition: Game.prototype.getWaveComposition,
    buildWaveSpawnCycle: Game.prototype.buildWaveSpawnCycle,
    getBossCountForWave: Game.prototype.getBossCountForWave,
    getBossProfileForWave: Game.prototype.getBossProfileForWave,
    findSpawnPosition() {
      return new THREE.Vector3(20, 5, 20);
    },
    showBossHealthBar(name) {
      ctx.bossBarName = name;
    },
    applyBossProfileVisuals() {},
    initBossLaserState(enemy) {
      enemy.bossLaserState = {
        phase: "cooldown",
      };
    },
  };

  Game.prototype.spawnEnemyForWave.call(ctx);
  assert(ctx.bossRoarPlayed === true, "spawnEnemyForWave should roar on boss spawn");
  assert(ctx.bossBarName === "Nightfang Executioner", "spawnEnemyForWave should announce current wave boss");
  assert(ctx.enemies.length === 1, "spawnEnemyForWave should add one enemy");
  assert(ctx.enemiesSpawnedThisWave === 1, "spawnEnemyForWave should increment spawn counter");
  assert(ctx.enemies[0].isBoss === true, "first spawn in wave should be boss");
  assert(ctx.currentBoss === ctx.enemies[0], "spawnEnemyForWave should track current boss");

  ctx.enemies.forEach((enemy) => {
    enemy.dispose?.();
    if (enemy.body) world.removeBody(enemy.body);
  });
}

function runEndStateChecks() {
  const loseCtx = {
    gameState: "PLAYING",
    player: {
      controls: {
        unlock() {
          loseCtx.playerUnlocked = true;
        },
      },
      allowUnlockedInput: true,
    },
    hideBossHealthBar() {
      loseCtx.bossBarHidden = true;
    },
    enemies: [{ isBoss: true }, { isBoss: false }],
    cleanupBossLaser() {
      loseCtx.cleanedBossLaser = (loseCtx.cleanedBossLaser || 0) + 1;
    },
    particles: {
      reset() {
        loseCtx.particlesReset = true;
      },
    },
    showEndScreen(opts) {
      loseCtx.endScreen = opts;
    },
  };

  Game.prototype.gameOver.call(loseCtx);
  assert(loseCtx.gameState === "GAMEOVER", "gameOver should move state to GAMEOVER");
  assert(loseCtx.playerUnlocked === true, "gameOver should unlock controls");
  assert(loseCtx.cleanedBossLaser === 1, "gameOver should clean boss laser visuals");
  assert(loseCtx.particlesReset === true, "gameOver should reset particles");
  assert(loseCtx.endScreen?.title === "GAME OVER", "gameOver should render game-over end screen");

  const victoryCtx = {
    victoryAchieved: false,
    waveState: "ACTIVE",
    gameState: "PLAYING",
    player: {
      controls: {
        unlock() {
          victoryCtx.playerUnlocked = true;
        },
      },
      allowUnlockedInput: true,
    },
    enemies: [{ isBoss: true }, { isBoss: false }],
    cleanupBossLaser() {
      victoryCtx.cleanedBossLaser = (victoryCtx.cleanedBossLaser || 0) + 1;
    },
    particles: {
      reset() {
        victoryCtx.particlesReset = true;
      },
    },
    hideBossHealthBar() {
      victoryCtx.bossBarHidden = true;
    },
    showEndScreen(opts) {
      victoryCtx.endScreen = opts;
    },
  };

  Game.prototype.triggerVictory.call(victoryCtx);
  assert(victoryCtx.victoryAchieved === true, "triggerVictory should set victory flag");
  assert(victoryCtx.waveState === "VICTORY", "triggerVictory should set wave state");
  assert(victoryCtx.gameState === "GAMEOVER", "triggerVictory should enter end state");
  assert(victoryCtx.playerUnlocked === true, "triggerVictory should unlock controls");
  assert(victoryCtx.endScreen?.title === "VICTORY", "triggerVictory should show victory screen");
}

function makeVec(x = 0, y = 0, z = 0) {
  return {
    x,
    y,
    z,
    set(nx, ny, nz) {
      this.x = nx;
      this.y = ny;
      this.z = nz;
    },
  };
}

function runRestartFlowCheck(getReloadCount) {
  const staleScene = new THREE.Scene();
  const staleFx = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  staleFx.userData.ephemeralFx = "tracer";
  staleScene.add(staleFx);

  const projectileMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffff00 }),
  );
  const powerUpMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
  );
  const enemyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }),
  );
  staleScene.add(projectileMesh);
  staleScene.add(powerUpMesh);
  staleScene.add(enemyMesh);

  const playerBody = {
    position: makeVec(0, 2, 30),
    velocity: makeVec(0, 0, 0),
    angularVelocity: makeVec(0, 0, 0),
    force: makeVec(0, 0, 0),
    torque: makeVec(0, 0, 0),
    wakeUp() {
      this.awake = true;
    },
  };

  const interval = setInterval(() => {}, 1000);
  const timeout = setTimeout(() => {}, 5000);

  const ctx = {
    restartInProgress: false,
    score: 1200,
    victoryAchieved: true,
    gameState: "GAMEOVER",
    waveState: "ACTIVE",
    gameTime: 55,
    lastSpawnTime: 2,
    lastPowerUpTime: 2,
    input: { keys: { KeyW: true } },
    uiCache: { score: 1200, remainingEnemies: 5, weaponString: "Pistol" },
    activeIntervals: [interval],
    waveOverlayTimeoutId: timeout,
    particles: {
      reset() {
        ctx.particlesReset = true;
      },
    },
    healthBars: {
      clear() {
        ctx.healthBarsCleared = true;
      },
    },
    lightPool: [{ active: true, timer: 1, light: { visible: true, intensity: 4 } }],
    player: {
      maxHealth: 100,
      health: 40,
      body: playerBody,
      dispose() {
        ctx.playerDisposed = true;
      },
      resetForRestart(spawn) {
        this.body.position.set(spawn.x, spawn.y, spawn.z);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
      },
      setSpeedMultiplier(multiplier) {
        ctx.playerSpeedMultiplierSet = multiplier;
      },
    },
    onPlayerHealthChange(health, type) {
      ctx.healthPulse = { health, type };
    },
    resetCombatHudFeedback() {
      ctx.combatHudReset = true;
    },
    waveNumber: 4,
    enemiesSpawnedThisWave: 17,
    enemiesKilledThisWave: 8,
    projectiles: [{ mesh: projectileMesh, body: { id: "p-body" } }],
    powerUps: [{
      mesh: powerUpMesh,
      body: { id: "u-body" },
      dispose() {
        ctx.powerUpDisposed = true;
      },
    }],
    scene: staleScene,
    world: {
      bodies: [playerBody, { type: Body.DYNAMIC, id: "orphan" }, { type: Body.STATIC, id: "wall" }],
      removeBody(body) {
        ctx.removedBodies = (ctx.removedBodies || 0) + 1;
        this.bodies = this.bodies.filter((entry) => entry !== body);
      },
    },
    enemies: [{
      isBoss: true,
      mesh: enemyMesh,
      body: { id: "e-body" },
      dispose() {
        ctx.enemyDisposed = true;
      },
    }],
    cleanupBossLaser() {
      ctx.cleanedBossLaser = (ctx.cleanedBossLaser || 0) + 1;
    },
    currentBoss: { id: "boss" },
    enemiesPerWave: 35,
    spawnRate: 0.8,
    difficultyTuning: { playerSpeedScale: 1.0 },
    playerSpeedMultiplier: 1.2,
    playerDamageMultiplier: 1.3,
    playerDamageCooldown: 2,
    buffTimers: { speed: 5, damage: 6 },
    selectedDifficulty: "hard",
    updateWeaponHUD() {
      ctx.weaponHudUpdated = true;
    },
    startGame(diff) {
      ctx.restartStartedWith = diff;
    },
  };

  Game.prototype.restartGame.call(ctx);

  assert(ctx.score === 0, "restartGame should reset score");
  assert(ctx.gameState === "MENU", "restartGame should reset gameState to MENU before start");
  assert(ctx.waveState === "STARTING", "restartGame should reset waveState");
  assert(ctx.waveNumber === 1, "restartGame should reset to wave 1");
  assert(Array.isArray(ctx.projectiles) && ctx.projectiles.length === 0, "restartGame should clear projectiles");
  assert(Array.isArray(ctx.powerUps) && ctx.powerUps.length === 0, "restartGame should clear powerups");
  assert(Array.isArray(ctx.enemies) && ctx.enemies.length === 0, "restartGame should clear enemies");
  assert(ctx.restartStartedWith === "hard", "restartGame should start selected difficulty again");
  assert(ctx.restartInProgress === false, "restartGame should always release restart lock");
  assert(ctx.healthPulse?.type === "heal", "restartGame should refresh health HUD state");
  assert(ctx.combatHudReset === true, "restartGame should clear hit-marker/crosshair UI state");
  assert(getReloadCount() === 0, "restartGame sanity should not require fallback page reload");
}

function runHitMarkerFeedbackCheck(elements) {
  const hitCtx = {
    audio: {
      playHitSound(isHeadshot) {
        hitCtx.lastHeadshot = isHeadshot;
      },
    },
  };

  Game.prototype.showHitMarker.call(hitCtx, true);
  const hitMarker = elements.get("hit-marker");
  const crosshair = elements.get("crosshair");
  assert(hitMarker.classList.contains("active"), "showHitMarker should activate hit marker");
  assert(hitMarker.classList.contains("headshot"), "showHitMarker should mark headshots");
  assert(crosshair.classList.contains("headshot-pulse"), "showHitMarker should pulse crosshair on headshots");
  assert(hitCtx.lastHeadshot === true, "showHitMarker should play headshot sound");
}

function main() {
  const { elements, getReloadCount } = installDomStubs();

  runWaveLifecycleChecks();
  runBossSpawnCheck();
  runEndStateChecks();
  runRestartFlowCheck(getReloadCount);
  runHitMarkerFeedbackCheck(elements);

  console.log("Gameplay flow sanity checks passed.");
}

main();
